require(["/js/jquery-ui-1.8.14.min.js"], function()
{
    $(function()
    {
        var game = window.game;
        var events = [
            'AuctionRemoved',
            'InventoryItemAdded',
            'ItemBought',
            'WalletChanged',
            'AuctionAdded',
            'InventoryItemRemoved',
            'AuctionSold',
            'AchievementUnlocked', ''];
        
        var rgx = /\/post\/([a-f0-9]+)\//;
        var uri = window.location.pathname;
        
        var match = rgx.exec(uri)
        if (match == null)
            return;
        
        id = match[1];
        
        events.each(function(k, name)
        {
            game.bind(name, function(evt)
            {
                jQuery.post('/post/',
                {
                    'name': name,
                    'data': evt,
                    'id': id
                });
            })
        });
    });
});