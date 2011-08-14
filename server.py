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
import urlparse
from binascii import crc32

import argparse
import flask
from gevent.wsgi import WSGIServer
import redis
from werkzeug import SharedDataMiddleware

app = None
db = None

def startapp(args):
    global app, db
    global get_next_url, add_next_url
    
    app = flask.Flask(__name__, static_url_path='/')
    #app.debug=True
    app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
        '/': os.path.join(os.path.dirname(__file__), 'static')})

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
    
    def add_next_url():
        db.sadd('url_ids', get_next_url())
    
    @app.route('/')
    def index(**kwargs):
        return flask.redirect('/index.htm')
    
    @app.route('/test', methods=['GET'])
    def test():
        return 'blah'
    
    @app.route('/post', methods=['POST'])
    def post():
        # Get the JSON of a gameplay transaction and store it in the database
        return 'OK'


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
