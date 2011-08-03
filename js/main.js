/**
 * <Trading Game>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

require(["js/jquery-1.6.2.min.js", "game"], jQueryInit);

var game = null;

function isFloat(str)
{
  return !isNaN(new Number(str));
}

function showBuyTabItems(items)
{
    var vals = [];
    $.each(items, function (k,v) { vals.push(v); });
    $('#tab_buying').html($.tmpl('auctions_list', {items: vals}));
    $('#tab_buying table.auctions_list').css('height', $('#tab_buying table.auctions_list').height() + 'px');
    
    var buy_item = document.createElement('div');
    buy_item.id = 'buy_item';
    $('#tab_buying').prepend(buy_item);
    
    $('#tab_buying table.auctions_list td').click(function ()
    {
        var id = $(this).parent().find('a').attr('name');
        $('#buy_item').html($.tmpl('buy_item_page', { item: game.auctionsWorld[id] }));
        $('#buy_item').css('height', $('#buy_item').height() + 'px');
        
        // The buy handler
        $('#buy_item div.confirm').click(function ()
        {
          var id = $(this).parent().find('a[name]').attr('name');
          game.buyItem(id);
        });
        
        // Add the back link handler
        $('#buy_item a.back').click(function ()
        {
            $('#buy_item').hide('slide', { direction: 'up' }, function ()
            {
                $('#tab_buying table.auctions_list').show('slide', { direction: 'down' });
            });
        });
        
        // Hide the table and show the buy item page
        $('#tab_buying table.auctions_list').hide('slide', { direction: 'down' }, function ()
        {
            $('#buy_item').show('slide', { direction: 'up' });
        });
    });
}

function showInventoryTabItems(items)
{
    var vals = [];
    $.each(items, function (k,v) { vals.push(v); });
    $('#tab_inventory').html($.tmpl('tab_inventory', {items: vals}));
    
    $('#tab_inventory .item').click(function ()
    {
      var id = $(this).find('a[name]').attr('name');
      if ($('#create_auction a[name]').attr('name') != id)
      {
          $('#create_auction').remove();
          $.tmpl('create_auction_dialog', {item: game.inventory[id]}).appendTo('body');
      }
      
      $('#create_auction').dialog({
        modal: true,
        resizable: false,
        draggable: false,
        width: '500px',
        buttons: [
          {
            text: 'Create',
            click: function (evt)
            {
              var input = $(this).find('input').attr('value');
              if (!isFloat(input))
              {
                  $(this).parent().find('button').first().jConf({
                    sText: 'Please enter a valid price.',
                    okBtn: 'Okay',
                    evt: evt
                  });
                  return;
              }
              
              var value = new Number(input);
              game.createAuction(id, value, null);
              $(this).dialog('close');
            }
          },
          {
            text: 'Cancel',
            click: function () { $(this).dialog('close'); }
          }
        ]
      });
    });
}

function showSellTabItems(items)
{
    var vals = [];
    $.each(items, function (k,v) { vals.push(v); });
    $('#tab_selling').html($.tmpl('auctions_list', {items: vals}));
}

function updateWallet(amount)
{
  $('#wallet span').html('$' + Math.floor(amount) + '.<span class="decimal">' +
      (amount % 1).toFixed(2).substring(2) + '');
}

function jQueryInit()
{
    game = require('game');
    game.populate();
    
    /*if (window.localStorage.game != undefined)
        game.load();*/
    
    require(["js/jquery-ui-1.8.14.min.js", "js/jquery.tmpl.min.js", "js/jConf-1.2.0.js"], function ()
    {
        $(function()
        {
            var tabs = $('#tabs').tabs().addClass('ui-tabs-vertical ui-helper-clearfix');
            $('#tabs li').removeClass('ui-corner-top');
            $('#tabs li').click(function() {
                $('#tabs').tabs('select', ''+$(this).children().attr('href'));
            });
            
            // Update wallet display
            updateWallet(game.wallet);
            game.bind('WalletChanged', function (evt)
            {
              updateWallet(evt.to);
            });
            
            $.get('js/templates/auctions_list.htm', {}, function (data)
            {
                $.template('auctions_list', data);
                showSellTabItems(game.auctionsMine);
                
                $.get('js/templates/buy_item_page.htm', {}, function (data)
                {
                    $.template('buy_item_page', data);
                    showBuyTabItems(game.auctionsWorld);
                    
                    game.bind('AuctionAdded', function (item)
                    {
                        showBuyTabItems(game.auctionsWorld);
                        showSellTabItems(game.auctionsMine);
                    });
                    game.bind('ItemBought', function (item)
                    {
                        showBuyTabItems(game.auctionsWorld);
                        $('#tab_buying a.back').click();
                    });
                    game.bind('AuctionSold', function (item)
                    {
                        showSellTabItems(game.auctionsMine);
                    });
                });
            });
            
            $.get('js/templates/tab_inventory.htm', {}, function (data)
            {
                $.template('tab_inventory', data);
                $.get('js/templates/create_auction_dialog.htm', {}, function (data)
                {
                    $.template('create_auction_dialog', data);
                    showInventoryTabItems(game.inventory);
                    
                    game.bind('InventoryItemAdded', function (item)
                    {
                      showInventoryTabItems(game.inventory);
                    });
                    game.bind('InventoryItemRemoved', function (item)
                    {
                      showInventoryTabItems(game.inventory);
                    });
                });
            });
        });
    });
    
    $(window).unload(function ()
    {
        game.save();
    });
}