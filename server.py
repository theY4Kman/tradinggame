# <Trading Game>
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
# 
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import json
import os
import os.path
import urlparse
from binascii import crc32

import argparse
import flask
from gevent.wsgi import WSGIServer
import redis
from werkzeug import SharedDataMiddleware

app = None
db = None
base = os.path.dirname(__file__)

def startapp(args):
    global app, db
    global get_next_url, add_next_url
    
    app = flask.Flask(__name__, static_url_path='/')
    app.debug=True
    app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
        '/': os.path.join(base, 'static')})

    db = redis.Redis(port=args.redis_port)


    # Generate the secret key if it hasn't been already
    if not db.exists('secretkey'):
        db.set('secretkey', os.urandom(36))
    app.secret_key = db.get('secretkey')
    
    
    def get_next_url():
        if not db.exists('next_url_id'):
            db.set('next_url_id', 0)
        url_id = db.get('next_url_id')
        db.incr('next_url_id')
        
        return ('%08x' % crc32(app.secret_key + url_id)).replace('-', '')
    
    def add_next_url(user):
        db.sadd('url_ids', get_next_url())
    
    @app.route('/')
    def index(**kwargs):
        return flask.redirect('/index.htm')
    
    @app.route('/post/', methods=['POST'])
    def post():
        if not (request.form.has_key('event') or
            not request.form.has_key('data') or
            not request.form.has_key('id')):
            return 500
        
        id = request.form['id']
        name = request.form['event']
        data = request.form['data']
        
        db.lpush('%s:log' % id, json.dumps({ 'name': name, 'data': data }))
        return 'OK'
    
    
    @app.route('/play/<id>/')
    def play(id):
        print db.sismember
        if not db.sismember('url_ids', id) and not db.exists('%s:log' % id):
            return '', 404
        
        db.lpush('%s:log' % id, 'Began game.')
        with open(os.path.join(base, 'static', 'index.htm'), 'r') as fp:
            return fp.read()


if __name__ == '__main__':
    parser = argparse.ArgumentParser('<Trading Game>')
    parser.add_argument('--port', type=int, default=8091)
    parser.add_argument('--redis-port', type=int, default=8500)
    args = parser.parse_args()
    
    startapp(args)

    print 'Serving on port', args.port
    if app.debug:
        app.run('0.0.0.0', args.port)
    else:
        http_server = WSGIServer(('', args.port), app)
        http_server.serve_forever()
