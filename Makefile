# EarthStation

# The controllers.js file, and others can get pretty large, so
# I divide the individual controllers code into separate files
# and make them into one file.
#
# The js folder, which canonically contains all the javascript logic
# of an angular app, is the "build executable" of this makefile.
# The source is in js-src.
#


JS = js
JS_SRC = js-src

CONTROLLERS = ${JS}/controllers.js
CONTROLLERS_SRC = ${JS_SRC}/controllers/*

APP = ${JS}/app.js
APP_SRC = ${JS_SRC}/app.js

all : app controllers

app : ${JS}
	cat ${APP_SRC} > ${APP}

controllers : ${JS}
	cat ${CONTROLLERS_SRC} > ${CONTROLLERS}

${JS} :
	mkdir ${JS}

clean :
	rm -rf ${JS}

