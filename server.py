import flask
from werkzeug import SharedDataMiddleware
from gevent.wsgi import WSGIServer

app = flask.Flask('Trading Game')

@app.route('/')
def index():
  return flask.redirect('index.htm')

app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
  '/': '.'
})
app.debug = True
http_server = WSGIServer(('localhost', 5000), app)
http_server.serve_forever()