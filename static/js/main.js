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

require(["/js/jquery-1.6.2.min.js", "game", "net"], jQueryInit);

var game = null;
var events = null;

// Time limit (in seconds)
var timeLimit = 60 * 5;
var _timeLeft = timeLimit;

function isFloat(str)
{
  return !isNaN(new Number(str));
}

// Formats currency currently to truncate at two decimal places
function currency(amount, decimal)
{
    if (decimal == undefined)
        decimal = true;
    
    if (!decimal)
        var str = Math.floor(amount).toString();
    else
        var str = amount.toFixed(3).slice(0,-1)
    
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(str))
        str = str.replace(rgx, '$1' + ',<wbr />' + '$2');
    
    return str;
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
        $('#buy_item div.confirm').click(function (evt)
        {
          var id = $(this).parent().find('a[name]').attr('name');
          
          try
          {
              game.buyItem(id);
          }
          catch (error)
          {
              if (error == 'Not enough money')
                  $(this).jConf({
                      sText: 'You don\'t have enough money to buy this item!',
                      okBtn: 'Okay',
                      evt: evt
                  });
              else
                  $(this).jConf({
                      sText: error,
                      okBtn: 'Okay',
                      evt: evt
                  });
              return;
          }
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
          $.tmpl('create_auction_dialog', {
            item: game.inventory[id],
            boughtFor: game.boughtFor[id]
          }).appendTo('body');
      }
      
      var input = $('#create_auction input');
      function changeNet()
      {
          function delayed()
          {
              var amt = input.val();
              if (!isFloat(amt))
                  $(this).parent().find('span.netprofit').html('-');
              else
              {
                  var entered = parseFloat(input.val());
                  var delta = entered - game.boughtFor[id];
                  input.parent().find('span.netprofit').html(((delta < 0) ? '-' : '') + '$' +
                      currency(Math.abs(delta)));
              }
          }
          
          setTimeout(delayed, 10);
      }
      
      $(document).keydown(changeNet);
      $('#create_auction input').change(changeNet);
      changeNet();
      
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
                    var input = $(this).find('input').val();
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
                    try
                    {
                        game.createAuction(id, value, null);
                    }
                    catch (error)
                    {
                        $(this).jConf({
                            sText: error,
                            okBtn: 'Okay',
                            evt: evt
                        });
                        return;
                    }
                    $(this).dialog('close');
                    
                    addNotification('Created auction for <span class="item_display">' +
                        game.inventory[id].name + '</span> for <span class="money">$' +
                        currency(value) + '</span>.', 'tab_selling');
                    
                    addTransaction({
                        description: 'Put <span class="item_display">' +
                            game.inventory[id].name + '</span> up for auction at ' +
                            '<span class="money">$' + currency(value) + '</span>.',
                        net: 0.0,
                        balance: game.wallet
                    });
                }
              },
              {
                  text: 'Cancel',
                  click: function () {
                      $(this).dialog('close');
                      $(document).unbind('keydown', changeNet);
                  }
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
  var wallet_amount = $('#wallet #wallet_amount');
  
  wallet_amount.html('$' + currency(amount, false) + '.<span class="decimal">' +
              currency(amount % 1).substring(2) + '</span>');
  
  var width = 0;
  $.each($('#wallet').children(), function (k,v) { width += $(v).width(); })
  
  if (width > $('#wallet').width())
      $('#wallet span.label').hide();
  else
      $('#wallet span.label').show();
  
  $('#wallet').effect('highlight', {color: '#66DE00'}, 750);
}

function removeClearNotifications()
{
    if ($('#tab_select li.notification').not('.removing').not('#clear_notifications').length == 0)
        $('#clear_notifications').slideUp(function () { $(this).remove(); });
}

/* `html` is the markup to put in the notification, and `tab` is the href minus
 * the pound sign of the tab to display if the player clicks on the notification
 */
function addNotification(html, tab, achievement)
{
    if (achievement == undefined)
        achievement = false;
    
    var elem = $(document.createElement('li'));
    
    elem.addClass('notification ui-corner-all');
    if (achievement)
        elem.addClass('achievement');
    
    if ($('#tab_select li.notification').length == 0)
    {
        var clear = $(document.createElement('li'));
        clear.attr('id', 'clear_notifications');
        clear.addClass('notification first hand ui-corner-all');
        clear.css('font-weight', 'bold');
        clear.html('Clear Notifications');
        clear.click(function ()
        {
            $('li.notification').slideUp(function () { $(this).remove(); });
        });
        clear.appendTo('#tab_select');
    }
    
    if (tab != undefined)
        elem.click(function ()
        {
            $('#tabs').tabs('select', tab);
        });
    
    elem.click(function ()
    {
        elem.addClass('removing');
        elem.slideUp(function () { elem.remove(); });
        removeClearNotifications();
    });
    
    if (achievement)
    {
        var innerdiv = $(document.createElement('div'));
        innerdiv.html(html);
        innerdiv.appendTo(elem);
    }
    else
        elem.html(html);
    
    $('li.notification').removeClass('first');
    elem.addClass('first');
    
    elem.insertAfter('#clear_notifications');
    elem.effect('highlightnobgchange', {}, 1000);
    setTimeout(function ()
    {
        elem.addClass('removing');
        elem.slideUp(function () { $(this).remove(); });
        removeClearNotifications();
    }, 30000);
}

function addAchievement(html)
{
    addNotification(html, undefined, true);
}

var last_transaction_id = 0;
/* `tr` should be a dictionary with three keys: description, net, and balance */
function addTransaction(tr)
{
    tr['id'] = ++last_transaction_id;
    $.tmpl('transaction', tr).appendTo('#transactions .list');
}

function setTimer(seconds)
{
    var str_sec = '' + (seconds % 60);
    if (str_sec.length == 1)
        str_sec = '0' + str_sec;
    
    $('#timer div').html(parseInt(seconds / 60) + ':' + str_sec);
}

/* Finishes the game and sends the user to the end page */
function endGame()
{
    addNotification('Game over! Thanks for playing.');
    window.localStorage['wallet'] = game.wallet;
    
    $('#timer').css('background-color', '#CD2626');
    $('#timer').effect('highlightnobgchange', {}, 1000);
    
    events.addEvent('EndGame', {'wallet': game.wallet});
    // Send anything left in the queue
    events.sendQueue('/end.htm');
}

function jQueryInit()
{
    game = require('game');
    game.populate();
    window.game = game;
    
    events = require('net');
    
    /*if (window.localStorage.game != undefined)
        game.load();*/
    
    require(["/js/jquery-ui-1.8.14.min.js", "/js/jquery.tmpl.min.js", "/js/jConf-1.2.0.js"], function ()
    {
        $(function()
        {
            (function($) {
 
                $.effects.highlightnobgchange = function(o) {
                 
                    return this.queue(function() {
                 
                        // Create element
                        var el = $(this), props = ['backgroundColor','opacity'];
                 
                        // Set options
                        var mode = $.effects.setMode(el, o.options.mode || 'show'); // Set Mode
                        var color = o.options.color || "#ffff99"; // Default highlight color
                        var oldColor = el.css("backgroundColor");
                 
                        // Adjust
                        $.effects.save(el, props); el.show(); // Save & Show
                        el.css({backgroundColor: color}); // Shift
                 
                        // Animation
                        var animation = {backgroundColor: oldColor };
                        if (mode == "hide") animation['opacity'] = 0;
                 
                        // Animate
                        el.animate(animation, { queue: false, duration: o.duration, easing: o.options.easing,
                        complete: function() {
                            if (mode == "hide") el.hide();
                            $.effects.restore(el, props);
                        if (mode == "show" && $.browser.msie) this.style.removeAttribute('filter');
                            if(o.callback) o.callback.apply(this, arguments);
                            el.dequeue();
                        }});
                 
                    });
                 
                };
                 
            })(jQuery);
            
            
            var tabs = $('#tabs').tabs().addClass('ui-tabs-vertical ui-helper-clearfix');
            $('#tabs li.ui-state-default').removeClass('ui-corner-top');
            $('#tabs li').click(function() {
                $('#tabs').tabs('select', ''+$(this).children().attr('href'));
            });
            
            // Update wallet display
            updateWallet(game.wallet);
            game.bind('WalletChanged', function (evt)
            {
              updateWallet(evt.to);
            });
            
            $.get('/js/templates/transaction.htm', {}, function (data)
                {
                    $.template('transaction', data);
                    
                    // Initial transaction
                    addTransaction({
                        description: 'Began game.',
                        net: 0.0,
                        balance: game.wallet
                    });
                    
                    // Setup the transactions log hooks
                    game.bind('ItemBought', function (auction)
                        {
                            addTransaction({
                                description: 'Bought <span class="item_display">' +
                                    auction.item.name + '</span>.',
                                net: -auction.price,
                                balance: game.wallet
                            });
                        });
                    game.bind('AuctionSold', function (auction)
                        {
                            addTransaction({
                                description: 'Sold <span class="item_display">' +
                                    auction.item.name + '</span>.',
                                net: auction.price,
                                balance: game.wallet
                            });
                        });
                });
            
            $.get('/js/templates/auctions_list.htm', {}, function (data)
                {
                    $.template('auctions_list', data);
                    showSellTabItems(game.auctionsMine);
                    
                    $.get('/js/templates/buy_item_page.htm', {}, function (data)
                    {
                        $.template('buy_item_page', data);
                        showBuyTabItems(game.auctionsWorld);
                        
                        game.bind('AuctionAdded', function (item)
                            {
                                showBuyTabItems(game.auctionsWorld);
                                showSellTabItems(game.auctionsMine);
                            });
                        game.bind('ItemBought', function (auction)
                            {
                                showBuyTabItems(game.auctionsWorld);
                                $('#tab_buying a.back').click();
                                
                                addNotification('Bought <span class="item_display">' +
                                    auction.item.name + '</span> for <span class="money">$' +
                                    currency(auction.price) + '</span>.', 'tab_selling');
                            });
                        game.bind('AuctionSold', function (auction)
                            {
                                showSellTabItems(game.auctionsMine);
                                
                                addNotification('Sold <span class="item_display">' +
                                    auction.item.name + '</span> for <span class="money">$' +
                                    currency(auction.price) + '</span>.');
                            });
                    });
                });
            
            $.get('/js/templates/tab_inventory.htm', {}, function (data)
                {
                    $.template('tab_inventory', data);
                    $.get('/js/templates/create_auction_dialog.htm', {}, function (data)
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
            
            game.bind('AchievementUnlocked', function(m)
                {
                    if (m.name.substring(0,4) == 'Cash')
                    {
                        var amount = m.name.substring(4);
                        addAchievement('Reached <span class="money">$' + currency(new Number(amount)) +
                            '</span> in your wallet!');
                    }
                });
            
            // Setup event post hooks
            game.bind('ItemBought', function(m)
            {
                events.addEvent('ItemBought', m);
            });
            game.bind('AuctionSold', function(m)
            {
                events.addEvent('AuctionSold', m);
            });
            
            // Setup the timer
            setTimer(_timeLeft);
            var timer = setInterval(function()
                {
                    if (_timeLeft <= 0)
                    {
                        clearInterval(timer);
                        endGame();
                    }
                    
                    setTimer(_timeLeft--);
                }, 1000);
            
            // Send a "began game" event to the server
            events.addEvent("Began game", {});
        });
    });
    
    $(window).unload(function ()
    {
        game.save();
    });
}