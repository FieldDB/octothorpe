octothorpe
==========
Just a random name, we can change it if we get better ideas.

http://couchapp.org/page/index has lots of information.

https://github.com/benoitc/erica looks like the way to deploy.  I'll experiment
with this.  This does require erlang and gcc to compile; I don't know how easy
it is on Windows.

If you have trouble with it, there's a Python version (couchapp), which is
deprecated in favor of Erica but probably still works.

jQuery interface for CouchDB:
http://daleharvey.github.io/jquery.couch.js-docs/symbols/index.html
(note the $.couch.db in sidebar with more methods)
This comes with your CouchDB install.

Started everything off with the example app template from erica.
This has a bunch of stuff already built, and some things we need to remove.

Deploying
---------
1. Copy couchapprc.template to .couchapprc and put in the correct passwords.
2. `erica push` to push to IrisCouch, or `erica push local` to use a couchdb on localhost.
