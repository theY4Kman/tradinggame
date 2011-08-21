// Singleton game object
define(['/js/microevent.js', '/js/sorted_item_list.js'], function () {

    var sorteditems = [];
    for (var i = 0; i < sorted_item_list.length; i++) {
        var v = sorted_item_list[i];
        sorteditems.push({img: v.imageurl,
                          value: parseFloat(v.price),
                          name: v.title,
                         });
    }

    var config = {
        rate_newitems: 0.01, // 100 seconds per item?
        rate_buy: 0.02, // FIXME this is a dumb parameter, replace with market model
        PROFIT_RATE: 0.2,
    };

    // Function to create an achievement
    function achievement_cash(amount) {
        var m = {
            name: 'Cash' + amount,
            description: 'Get $' + amount + ' in your wallet',
            unlocked: false,
            install: function (game) {
                game.achievements[m.name] = this;
                function check(evt) {
                    if (game.wallet >= amount) {
                        m.unlocked = true;
                        game.trigger('AchievementUnlocked', m);
                        game.unbind('WalletChanged', check)
                    }                    
                }
                game.bind('WalletChanged', check);
            },
        };
        return m;
    }
    
    var achievements = {
        'Cash500': achievement_cash(500),
        'Cash1000': achievement_cash(1000),
        'Cash1500': achievement_cash(1500),
    };

    var items = [
        {img: '/img/cupcake.jpg', name: 'Cupcake', value: 2.0},
        {img: '/img/muffler.jpg', name: 'Muffler', value: 230.0},
        {img: '/img/textbook.jpg', name: 'Textbook', value: 100.0},
        {img: '/img/car.jpg', name: 'Car', value: 12000.0},
        {img: '/img/ps3.jpg', name: 'PS3', value: 500.0},
    ];

    var sellers = {
        'Joe': {id:'Joe', ratings:{pos: 10, neg:5}, priv:{defect_rate:0.6}},
        'Andrew': {id:'Andrew', ratings:{pos: 10, neg:5}, priv:{defect_rate:0.8}},
        'Zach': {id:'Zach', ratings:{pos: 10, neg:5}, priv:{defect_rate:0.0}},
    }

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
        this.boughtFor = {};
        this.auctionsWorld = {};
        this.auctionsMine = {};
        this.timestamp = new Date().getTime();
        this.wallet = 20.00;
        this.nyms = {
            'NymA': {id:'NymA', ratings:{pos: 1, neg:2}},
            'NymB': {id:'NymB', ratings:{pos: 1, neg:2}},
        }
        var self = this;
        this._ticker = setInterval(function () { self.trigger('tick'); }, 500);
        this.bind('tick', this._tick);

        // Install all the achievements
        this.achievements = {};
        for (var k in achievements) {
            achievements[k].install(this);
        }
        
        // Create some default logs
        logtriggers = ['ItemBought',
                       'AuctionSold',
                       'AchievementUnlocked'];
        for (var i in logtriggers) {
            (function (game) {
                var s = logtriggers[i];
                game.bind(s, function (d) { console.info([s, JSON.stringify(d)]) });
            })(this);
        }
    }

    Game.prototype.newAuctionWorld = function (networth) {
        networth = networth || this.wallet;

        // fixme: add either A) a normal distribution here, 
        // or B) a sampling based on a buy/sell volume curve
        var factor = 0.3 + (Math.random()*2-1)*0.2;
        //var price = item.value * (1+(Math.random()*2-1)*0.1);
        var price = networth * factor;
        price = Math.round(price*100)/100;

        function pricechoice(items, price) {
            for (var i = 1; i < items.length; i++) {
                if (items[i].value > price)
                    return items[i-1];
            }
            return items[0];
        }

        //var item = Object.create(choice(items));
        // Create a clone of an item with a unique key
        var item = Object.create(pricechoice(sorteditems, price));
        item.id = randomString(20);

        var seller = choice(sellers);

        var auction = {
            id: randomString(20),
            item: item,
            price: price,
            seller: seller,
            timestamp: new Date().getTime(),
        }
        return auction;
    };

    Game.prototype.save = function () {
        window.localStorage.game = JSON.stringify(this);
    }

    Game.prototype.load = function () {
        var obj = JSON.parse(window.localStorage.game);
        for (var k in obj) {
            if (!obj.hasOwnProperty(k)) continue;
            if (['_ticker', '_events'].indexOf(k) >= 0) continue; 
            this[k] = obj[k];
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
        // Clear all the existing world auctions
        for (var id in this.auctionsWorld) {
            var auction = this.auctionsWorld[id];
            delete(this.auctionsWorld[id]);
            this.trigger('AuctionRemoved', auction);
        }

        // Find our total networth by adding all inventory items
        // FIXME make networth a game property, like wallet. Or at least a property
        // of the inventory
        var networth = this.wallet;
        for (var k in this.inventory) {
            networth += this.boughtFor[this.inventory[k].id];
        }

        // Add 10 more auctions
        var n_auctions = 10;        
        for (var i = 0; i < n_auctions; i++) {
            var auction = this.newAuctionWorld(networth);
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
        this.boughtFor[item.id] = auction.price;
        delete(this.auctionsWorld[auction.id]);
        var oldwallet = this.wallet;
        this.wallet -= auction.price;
        this.trigger('AuctionRemoved', auction);
        this.trigger('WalletChanged', {'from':oldwallet, 'to':this.wallet});
        this.trigger('ItemBought', auction);
        this.trigger('InventoryItemAdded', item);

        this.createAuction(item.id, auction.price * (1.0 + config.PROFIT_RATE));
        this.populate();
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

    Game.prototype.autoplay = function() {
        var game = this;
        function autoplay() {
            var auction = choice(game.auctionsWorld);
            game.buyItem(auction.id);
        }
        game._autoplay = setInterval(autoplay, 2000);
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