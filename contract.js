/*
 * Design by Contract Module for Javascript
 */
(function(){ 'use strict';

var FN_ARG_SPLIT = /\s*,\s*/;
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_DECL = /^.*\)([^{]*){/m;
var STRIP_COMMENTS = /(\s*(\/\/.*$)|(\s*\/\*[\s\S]*?\*\/))/mg;
var ANNOTATION = /@(\w*)/mg;

function getFnMetadata(fn) {
  var fn_args = fn.toString().match(FN_ARGS);
  var params = fn_args[1].split(FN_ARG_SPLIT);
  var meta = {
    params: []
  };
  
  // gather parameter metadata
  for (var ii in params) {
    var val = params[ii];
    var name = val.replace(STRIP_COMMENTS, '');
    var annotations = val.match(ANNOTATION);
    meta.params[name] = {
      annotations: annotations
    }; 
  }

  // gather overall metadata
  var fn_decl = fn.toString().match(FN_DECL)[1];
  meta.annotations = fn_decl.match(ANNOTATION);
  return meta;
}

function ContractError() {
  return Error.apply(this, arguments);
}

var annotationRegistry = {};

function registerAnnotation(annotationName, fn) {
  annotationRegistry['@' + annotationName] = fn;
}

function registerAnnotationMap(map) {
  for (var name in map) {
    registerAnnotation(name, map[name]);
  }
}

function register() {
  if (arguments.length == 2) {
    registerAnnotation(arguments[0], arguments[1]);
  } else if (typeof arguments[0] === 'object') {
    registerAnnotationMap(arguments[0]);
  } else {
    throw Error("Invalid arguments/types for register");
  }
}

function makeRegisteredPre(paramName, annotationName) {
  return function(argMap) {
    var value = argMap[paramName];
    var ann = annotationRegistry[annotationName];
    if (ann === undefined || typeof ann !== 'function') {
      var precondition_failure = new Error(
        'Annotation ' + annotationName + 
        ', for parameter ' + paramName + 
        ', does not exist.');
      throw precondition_failure;
    }
    if (!ann(value, argMap)) {
      var precondition_failure = new Error(
        'Argument for parameter "' + paramName + 
        '" does not satisfy ' + annotationName +
        ': "' + value + '"');
      throw precondition_failure;
    }
  };
} 

function makeRegisteredPost(annotationName) {
  return function(retval, argMap) {
    var ann = annotationRegistry[annotationName];
    if (ann === undefined || typeof ann !== 'function') {
      var precondition_failure = new Error(
        'Annotation ' + annotationName + 
        ', for return value, does not exist.');
      throw precondition_failure;
    }
    if(!ann(retval, argMap)) {
      var postcondition_error = new Error(
        "Function return value does not satisfy " + annotationName);
      throw postcondition_error;
    }
  }; 
} 

function makeContract(fn) {
  // don't bother re-wrapping
  if (fn._pre !== undefined) {
    return fn;
  }

  // the actual contract wrapper
  var contract = function() {
    // just run body if contract execution is disabled
    if (!module.exports.RUN_CONTRACTS) {
      return contract._body.apply(contract._body, arguments);
    }
   
    // build map of arguments, keyed by position and name
    var arg_map = {};
    for (var ii in arguments) {
      arg_map[ii] = arguments[ii];
      if (ii < contract._names.length) {
        arg_map[contract._names[ii]] = arguments[ii];
      }
    }

    // run preconditons
    for (var ii in contract._pre) {
      var fn = contract._pre[ii];
      var val = fn(arg_map);
      if (val !== undefined) return val;
    }

    // run the function body
    var retval = contract._body.apply(contract._body, arguments);

    // run postconditions
    for (var ii in contract._post) {
      var fn = contract._post[ii];
      var val = fn(retval, arg_map);
      if (val !== undefined) return val;
    }

    // return body result
    return retval;
  }

  // contract defaults
  contract._pre = [];
  contract._post = [];
  contract._body = fn;
  contract._names = [];
  contract._meta = getFnMetadata(fn);
  
  // register names and preconditions from annotations
  var meta = contract._meta;
  for (var name in meta.params) {
    var val = meta.params[name];
    contract._names.push(name);

    for (var jj in val.annotations) {
      var ann = val.annotations[jj];
      contract._pre.push(makeRegisteredPre(name, ann));
    }
  }

  // register postconditions from annotations
  for (var jj in val.annotations) {
    var ann = val.annotations[jj];
    contract._post.push(makeRegisteredPost(ann));
  }

  return contract;
}

Function.prototype.pre = function(fn) {
  if (!module.exports.USE_CONTRACTS) { return this; }
  var contract = makeContract(this);
  contract._pre.push(fn);
  return contract;
};

Function.prototype.post = function(fn) {
  if (!module.exports.USE_CONTRACTS) { return this; }
  var contract = makeContract(this);
  contract._post.push(fn);
  return contract;
};


module.exports = {
  // global switch to disable contract wrapping
  USE_CONTRACTS: true,

  // global switch to disable contract execution
  RUN_CONTRACTS: true,

  make: function(fn) {
    if (!module.exports.USE_CONTRACTS) { return fn; }
    return makeContract(fn);
  },

  register: register
};

}());  // end module
