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

function showBuyTabItems(items)
{
    var vals = [];
    $.each(items, function (k,v) { vals.push(v); });
    $('#tab_buying').html($.tmpl('tab_buying', {items: vals}));
    $('table#items').css('height', $('table#items').height() + 'px');
    
    $('#tab_buying table#items td').click(function ()
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
                $('table#items').show('slide', { direction: 'down' });
            });
        });
        
        // Hide the table and show the buy item page
        $('table#items').hide('slide', { direction: 'down' }, function ()
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
            click: function ()
            {
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

function updateWallet(amount)
{
  $('#wallet span').html('$' + Math.floor(amount) + '.<span class="decimal">' +
      (amount % 1).toFixed(2).substring(2) + '');
}

function jQueryInit()
{
    game = require('game');
    game.populate();
    
    require(["js/jquery-ui-1.8.14.min.js", "js/jquery.tmpl.min.js"], function ()
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
            
            $.get('js/templates/tab_buying.htm', {}, function (data)
            {
                $.template('tab_buying', data);
                $.get('js/templates/buy_item_page.htm', {}, function (data)
                {
                    $.template('buy_item_page', data);
                    showBuyTabItems(game.auctionsWorld);
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
                });
            });
        });
    });
}