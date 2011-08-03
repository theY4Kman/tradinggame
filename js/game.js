// Singleton game object
define(['js/microevent.js'], function () {
    var config = {
        rate_newitems: 0.01, // 100 seconds per item?
        rate_buy: 0.1, // FIXME this is a dumb parameter, replace with market model
    };

    var items = [
        {img: 'img/cupcake.jpg', name: 'Cupcake', value: 2.0},
        {img: 'img/muffler.jpg', name: 'Muffler', value: 230.0},
        {img: 'img/textbook.jpg', name: 'Textbook', value: 100.0},
        {img: 'img/car.jpg', name: 'Car', value: 12000.0},
        {img: 'img/ps3.jpg', name: 'PS3', value: 500.0},
    ];

    var sellers = {
        'Joe': {id:'Joe', ratings:{pos: 10, neg:5}, priv:{defect_rate:0.6}},
        'Andrew': {id:'Andrew', ratings:{pos: 10, neg:5}, priv:{defect_rate:0.8}},
        'Zach': {id:'Zach', ratings:{pos: 10, neg:5}, priv:{defect_rate:0.0}},
    }

    function newAuctionWorld() {
        // Create a clone of an item with a unique key
        var item = Object.create(choice(items));
        item.id = randomString(20);
        var seller = choice(sellers);
        // fixme: add either A) a normal distribution here, 
        // or B) a sampling based on a buy/sell volume curve
        var price = item.value * (1+(Math.random()*2-1)*0.1);
        price = Math.round(price*100)/100;
        var auction = {
            id: randomString(20),
            item: item,
            price: price,
            seller: seller,
            timestamp: new Date().getTime(),
        }
        return auction;
    };

    function randomString(len, charSet) {
        charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var randomString = '';
        for (var i = 0; i < len; i++) {
            var randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz,randomPoz+1);
        }
        return randomString;
    }
    
    Object.size = function(obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    function choice(objs) {
        if (objs.length != undefined)
            return objs[Math.floor(Math.random()*objs.length)];
        else {
            var idx = Math.floor(Math.random()*Object.size(objs));
            var i = 0;
            for (key in objs)
                if (i++ == idx)
                    return objs[key];
        }
    }
    
    // Game object
    function Game(){
        this.inventory = {};
        this.auctionsWorld = {};
        this.auctionsMine = {};
        this.timestamp = new Date().getTime();
        this.wallet = 1000.0;
        this.nyms = {
            'NymA': {id:'NymA', ratings:{pos: 1, neg:2}},
            'NymB': {id:'NymB', ratings:{pos: 1, neg:2}},
        }
        var self = this;
        this._ticker = setInterval(function () { self.trigger('tick'); }, 500);
        this.bind('tick', this._tick);

        // Create some default logs
        logtriggers = ['InventoryItemAdded', 
                       'AuctionAdded', 
                       'ItemBought',
                       'AuctionSold'];
        for (var i in logtriggers) {
            (function (game) {
                var s = logtriggers[i];
                game.bind(s, function (d) { console.info([s, JSON.stringify(d)]) });
            })(this);
        }
    }

    Game.prototype._tick = function () {
        // Tick logic
        // For every auction the user has up for sale, maybe buy it
        for (var id in this.auctionsMine) {
            if (!this.auctionsMine.hasOwnProperty(id)) continue;
            var auction = this.auctionsMine[id];
            var item = auction.item;
            if (!this.inventory.hasOwnProperty(item.id)) 
                throw "Auction for item not in inventory";

            // FIXME implement a dice roll based on the market properties,
            // the item value, and the auction price
            if (Math.random() < config.rate_buy) {
                delete(this.inventory[item.id]);
                delete(this.auctionsMine[auction.id]);
                var oldwallet = this.wallet;
                this.wallet += auction.price;
                this.trigger('WalletChanged', {'from':oldwallet, 'to':this.wallet});
                this.trigger('InventoryItemRemoved', auction.item);
                this.trigger('AuctionSold', auction);
                this.trigger('AuctionRemoved', auction);
            }

        }
    }

    // Call this to populate the buyable items with some initial things
    Game.prototype.populate = function () {
        var n_auctions = 10;
        for (var i = 0; i < n_auctions; i++) {
            var auction = newAuctionWorld();
            this.auctionsWorld[auction.id] = auction;
            this.trigger('AuctionAdded', auction);
        }
    }

    // Buy an item
    Game.prototype.buyItem = function (id) {
        if (!this.auctionsWorld.hasOwnProperty(id)) throw "No such auction";
        var auction = this.auctionsWorld[id];
        var item = auction.item;
        if (auction.price > this.wallet) throw "Not enough money";

        // FIXME add a delay so it doesn't immediately go to inventory, but simulates
        // the market
        this.inventory[item.id] = item;
        delete(this.auctionsWorld[auction.id]);
        var oldwallet = this.wallet;
        this.wallet -= auction.price;
        this.trigger('AuctionRemoved', auction);
        this.trigger('WalletChanged', {'from':oldwallet, 'to':this.wallet});
        this.trigger('ItemBought', auction);
        this.trigger('InventoryItemAdded', item);
    }

    // Put an item up for sale
    Game.prototype.createAuction = function (id, price, nym) {
        if (!this.inventory.hasOwnProperty(id)) throw "Item not in inventory";
        var item = this.inventory[id];
        if (item.auctionid in this.auctionsMine) 
            throw "Item is already for sale: " + JSON.stringify(item);

        // FIXME use the nym from the arguments
        var nym = choice(this.nyms);
        var auction = {
            id: randomString(20),
            item: item,
            price: price,
            seller: nym,
            timestamp: new Date().getTime(),
        }
        // Add the auction
        this.auctionsMine[auction.id] = auction;
        item.auctionid = auction.id;
        this.trigger('AuctionAdded', auction);
    }

    Game.prototype.testA = function() {
        // Buy something
        var auction = choice(this.auctionsWorld)
        this.buyItem(auction.id);
        // Sell it right away at 10% markup
        var item = auction.item;
        this.createAuction(item.id, item.value * 1.1);
    }

    MicroEvent.mixin(Game);
    var game = new Game();
    return game;
});