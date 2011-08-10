import argparse
import flask
from gevent.wsgi import WSGIServer
import json
import os
import urlparse
import redis

app = flask.Flask(__name__, static_path='/')
#app.debug=True
from werkzeug import SharedDataMiddleware
app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
    '/': os.path.join(os.path.dirname(__file__), 'static')})

db = redis.Redis(port=8500)


# Generate the secret key if it hasn't been already
if db.get('secretkey') is None:
    db.set('secretkey', os.urandom(36))
app.secret_key = db.get('secretkey')


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
    parser = argparse.ArgumentParser('BrowserID Chat Server')
    parser.add_argument('--port', type=int, default=8091)
    ARGS = parser.parse_args()

    print 'Serving on port', ARGS.port
    if app.debug:
        app.run('0.0.0.0', ARGS.port)
    else:
        http_server = WSGIServer(('', ARGS.port), app)
        http_server.serve_forever()
