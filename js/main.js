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

function showBuyTabItems(items)
{
    var vals = [];
    $.each(items, function (k,v) { vals.push(v); });
    $('#tab_buying').html($.tmpl('tab_buying', {'items':vals}));
}

////////////////////////////
var items = {
    items: [
	{ img: 'img/cupcake.jpg', name: 'Cupcake', price: 100, up: 10, down: 10 },
	{ img: 'img/cupcake.jpg', name: 'Cupcake', price: 200, up: 10, down: 10 }
    ]
};

var game;
function jQueryInit() {
    game = require('game');
    game.populate();

    require(["js/jquery-ui-1.8.14.min.js", "js/jquery.tmpl.min.js"], function () {
	$(function() {
	    var tabs = $('#tabs').tabs().addClass('ui-tabs-vertical ui-helper-clearfix');
	    $('#tabs li').removeClass('ui-corner-top');
	    $('#tabs li').click(function() {
		$('#tabs').tabs('select', ''+$(this).children().attr('href'));
	    });
	    
	    $.get('js/templates/tab_buying.htm', {}, function (data) {
		$.template('tab_buying', data);
		$('#tab_buying').html($.tmpl('tab_buying'));
		//////////////////
		showBuyTabItems(game.auctionsWorld);
	    });
	});
    });
}
