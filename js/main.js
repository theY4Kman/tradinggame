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

require(["js/jquery-1.6.2.min.js"], jQueryInit);

////////////////////////////
var items = [
  { id: 0, img: 'img/cupcake.jpg', name: 'Cupcake', price: 100, seller: { name: 'ButtMuffin', up: 10, down: 10 } },
  { id: 1, img: 'img/cupcake.jpg', name: 'Cupcake', price: 200, seller: { name: 'TheMuffinMan', up: 10, down: 10 } }
];

var item_db = {
  0: items[0],
  1: items[1]
};

function showBuyTabItems(items)
{
  $('#tab_buying').html($.tmpl('tab_buying', items));
  $('table#items').css('height', $('table#items').height() + 'px');
  
  $('#tab_buying table#items td').click(function ()
  {
    var id = parseInt($(this).parent().find('a').attr('name'));
    $('#buy_item').html($.tmpl('buy_item_page', { item: item_db[id] }));
    $('#buy_item').css('height', $('#buy_item').height() + 'px');
    
    $('#buy_item a.back').click(function ()
    {
      $('#buy_item').hide('slide', { direction: 'up' }, function ()
      {
        $('table#items').show('slide', { direction: 'down' });
      });
    });
    
    $('table#items').hide('slide', { direction: 'down' }, function ()
    {
      $('#buy_item').show('slide', { direction: 'up' });
    });
  });
}

function jQueryInit()
{
  require(["js/jquery-ui-1.8.14.min.js", "js/jquery.tmpl.min.js"], function ()
  {
    $(function()
    {
      var tabs = $('#tabs').tabs().addClass('ui-tabs-vertical ui-helper-clearfix');
      $('#tabs li').removeClass('ui-corner-top');
      $('#tabs li').click(function() {
        $('#tabs').tabs('select', ''+$(this).children().attr('href'));
      });
      
      $.get('js/templates/tab_buying.htm', {}, function (data)
      {
        $.template('tab_buying', data);
        $('#tab_buying').html($.tmpl('tab_buying'));
        
        $.get('js/templates/buy_item_page.htm', {}, function (data)
        {
          $.template('buy_item_page', data);
        
          //////////////////
          showBuyTabItems({items: items});
        });
      });
    });
  });
}
