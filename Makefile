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

APP = ${JS}/app.js
APP_SRC = ${JS_SRC}/app.js

CONTROLLERS = ${JS}/controllers.js
CONTROLLERS_SRC = ${JS_SRC}/controllers/*

DIRECTIVES = ${JS}/directives.js
DIRECTIVES_SRC = ${JS_SRC}/directives/*

SERVICES = ${JS}/services.js
SERVICES_SRC = ${JS_SRC}/services/*

all : app controllers directives services

app : ${JS}
	cat ${APP_SRC} > ${APP}

directives : ${JS}
	cat ${DIRECTIVES_SRC} > ${DIRECTIVES}

services : ${JS}
	cat ${SERVICES_SRC} > ${SERVICES}

controllers : ${JS}
	cat ${CONTROLLERS_SRC} > ${CONTROLLERS}

${JS} :
	mkdir ${JS}

clean :
	rm -rf ${JS}

