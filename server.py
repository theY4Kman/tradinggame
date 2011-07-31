import flask
from werkzeug import SharedDataMiddleware

app = flask.Flask('Trading Game')

@app.route('/')
def index():
  return flask.redirect('index.htm')

app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
  '/': '.'
})
app.debug = True
app.run()