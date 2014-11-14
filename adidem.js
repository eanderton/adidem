/*
  Ad Idem - Design by Contract Module for JavaScript
  - Core Library File

Copyright (c) 2014, Eric Anderton
All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1) Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2) Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3) Neither the name of the ORGANIZATION nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function(root){ 'use strict';

// Type tests

function isFunction(value) {
  return typeof value === 'function'; 
}

function isObject(value) {
  return typeof value === 'object'; 
}

function isArray(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
}

function isString(value) {
  return typeof value === 'string';
}

function isNumber(value) {
  return typeof value === 'number';
}

function isUndefined(value) {
  return typeof value === 'undefined';
}

function isNull(value) {
  return typeof value === 'null';
}


// Rendition of Crockford's 'supplant' function for QnD string interpolation
var format = function (fmt, o) {
  return fmt.replace(/{{([^{}]*)}}/g, function(a, b) {
    var r = o[b];
    if (isUndefined(r)) { return 'undefined'; }
    if (isNull(r))      { return 'null'; }
    if (isString(r))    { return '"' + r + '"'; }
    if (isFunction(r))  { return 'function'; }
    if (isArray(r))     { return 'array'; }
    if (isObject(r))    { return 'object'; }
    return r;
  }).replace(/{([^{}]*)}/g, function (a, b) {
    var r = o[b];
    if (isString(r)) { return r; }
    if (isNumber(r)) { return r; }
    return a;
  });
};


// regexes for function source parsing
var FN_ARG_SPLIT = /\s*,\s*/;
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_DECL = /^.*\)([^{]*){/m;
var STRIP_COMMENTS = /(\s*(\/\/.*$)|(\s*\/\*[\s\S]*?\*\/))/mg;
var ANNOTATION = /@(\w*)/mg;


// parse metadata from function source
function parseFnMetadata(fn) {
  var fn_args = fn.toString().match(FN_ARGS);
  var params = fn_args[1].split(FN_ARG_SPLIT);
  var meta = {
    names: [],
    params: {},
  };
  
  // gather parameter metadata
  for (var ii in params) {
    var val = params[ii];
    var name = val.replace(STRIP_COMMENTS, '').trim();
    var annotations = val.match(ANNOTATION);
    meta.names.push(name);
    meta.params[name] = annotations;
  }

  // gather overall metadata
  var fn_decl = fn.toString().match(FN_DECL)[1];
  meta.retval = fn_decl.match(ANNOTATION);
  return meta;
}


// build metadata from single array of values
function convertMetadata(values) {
  var meta = {
    names: [],
    params: {},
    retval: []
  };
  var name = 'return';  // default to return meta param
  var annotations = [];

  // utility to respond to a name token in the list 
  function nextName() {
    if (name === 'return') {
      meta.retval = meta.retval.concat(annotations);
    } else {
      meta.names.push(name);
      meta.params[name] = annotations;
    }
  }

  // gather params and annotations in order
  for (var ii in values) {
    var val = values[ii].toString();  // force string conversion
    if (val[0] == '@') {
      annotations.push(val); 
    } else {
      nextName();
      name = val;
      annotations = [];
    }
  }
  nextName();  // trailing write

  return meta;
}


// error type - used to distinguish between contractual
// and non-contractural failures
function ContractError() {
  var err = Error.apply(this, arguments);
  this.stack = err.stack;
  this.message = err.message;
  return this;
}
ContractError.prototype = Object.create(Error.prototype);


// stock set of annotations
var annotationRegistry = {
  '@null': isNull,
  '@undefined': isUndefined,
  '@function': isFunction,
  '@object': isObject,
  '@array': isArray,
  '@string': isString,
  '@number': isNumber,
  '@iterable': function(value) {
    return isObject(value) || isArray(value);
  },
  '@hash': function(value) {
    return isObject(value) && !isArray(value);
  },
  '@integer': function(value) { 
    return isNumber(value) &&
      value >= 0 && 
      parseInt(value) == value; 
  },
  '@bool': function(value) {
    return value === true || value === false;
  },
  '@truthy': function(value) {
    return !!value;
  },
  '@falsy': function(value) {
    return !value;
  },
  '@defined': function(value) {
    return !isUndefined(value);
  },
  '@notnull': function(value) {
    return !isNull(value);
  },
  '@safe': function(value) {
    return !isNull(value) && !isUndefined(value);
  },
  '@contract': function(value) {
    return isFunction(value) && hasContract(value);
  }
};


// construct a precondition based on an annotation
function makeAnnotatedPre(paramName, annotationName) {
  return function(argMap) {
    var value = argMap[paramName];
    var ann = annotationRegistry[annotationName];
    if (ann === undefined || typeof ann !== 'function') {
      var precondition_failure = new Error(format(
        'Annotation {0}, for parameter "{1}", does not exist', [
        annotationName, paramName]));
      throw precondition_failure;
    }
    if (!ann(value, paramName, argMap)) {
      var precondition_failure = new ContractError(format(
        'Argument for parameter "{0}", does not satisfy {1}: {{2}}', [
        paramName, annotationName, value]));
      throw precondition_failure;
    }
  };
} 


// construct a postcondition based on an annotation
function makeAnnotatedPost(annotationName) {
  return function(retval, argMap) {
    var ann = annotationRegistry[annotationName];
    if (ann === undefined || typeof ann !== 'function') {
      var postcondition_failure = new Error(format(
        'Annotation {0}, for return value, does not exist.', [
        annotationName]));
      throw postcondition_failure;
    }
    if(!ann(retval, null, argMap)) {
      var postcondition_error = new ContractError(format(
        'Function return value does not satisfy {0}: {{1}}', [
        annotationName, retval]));
      throw postcondition_error;
    }
  }; 
} 


// test to see if a function has a contract
function hasContract(fn) {
  return fn._pre !== undefined;
}


// build map of arguments, keyed by position and name
function getArgMap(names, args) {
  var argMap = {};
  for (var ii=0; ii<args.length; ii++) {
    argMap[ii] = args[ii];
    if (ii < names.length) {
      argMap[names[ii]] = args[ii];
    }
  }
  return argMap;
}


// generate contract using metadata contract specification
var makeContractWithMeta = function(meta, fn) {
  // don't bother re-wrapping
  if (hasContract(fn)) {
    return fn;
  }

  // the actual contract wrapper
  // runs preconditions, body, and postconditions against the arg map

  // TODO: make multiple annotations an OR grouping, not an AND grouping
  var contract = function() {
    var argMap = getArgMap(contract._meta.names, arguments);
    for (var ii in contract._pre) {
      contract._pre[ii](argMap);
    }
    var retval = contract._body.apply(contract._body, arguments);
    for (var ii in contract._post) {
      contract._post[ii](retval, argMap);
    }
    return retval;
  }

  // contract defaults
  contract._pre = [];
  contract._post = [];
  contract._body = fn;
  contract._meta = meta;

  // register pre and postconditions from metadata
  var meta = contract._meta;
  for (var name in meta.params) {
    var val = meta.params[name];
    for (var jj in val) {
      var ann = val[jj];
      contract._pre.push(makeAnnotatedPre(name, ann));
    }
  }
  for (var jj in meta.retval) {
    var ann = meta.retval[jj];
    contract._post.push(makeAnnotatedPost(ann));
  }

  return contract;
}


var parseContract = function(fn) {
  return makeContractWithMeta(parseFnMetadata(fn), fn);
};


var makeContractShorthand = function(values, fn) {
  return makeContractWithMeta(convertMetadata(values), fn);
};


// multi-contract dispatch.  Tries each contract, and calls
// body on first contract that passes.
var callContractUnion = function(fnArray, args) {
    var exception;
    var exceptionRank = -1;
    for (var ii in fnArray) {
      var fn = fnArray[ii];
      // just call it if there's no contract
      if (!hasContract(fn)) {
        return fn.apply(fn, args);
      }
      
      // test preconditons
      var argMap = getArgMap(fn._meta.names, args);
      try {
        for (var ii in fn._pre) {
          fn._pre[ii](argMap);
        }
      } catch (e) {
        if (e instanceof ContractError) {
          // keep the most qualified contract exception
          if (ii > exceptionRank) {
            exception = e;
            exceptionRank = ii;
          }
        } else {
          throw e;  // rethrow all but contract errors
        }
        continue;  // try next contract 
      }

      // run the function body and postconditions
      var retval = fn._body.apply(fn._body, args);
      for (var ii in fn._post) {
        fn._post[ii](retval, argMap);
      }
      return retval;
    }
    // throw the last exception since everything failed 
    // TODO: better error output here (show all contracts?)
    if (exception !== undefined) {
      throw exception;
    }
}


// constructs a multi-contract closure
// allows for several kinds of input
// fn [, fn ...]
// object, fn [[object, fn] ...]
// array, fn [[array, fn] ...]
var makeContractUnion = function() {
  // return something that's callable on zero args
  if (arguments.length == 0) {
    return function() {};  // no-op
  }

  var fnArray = [];
  for (var ii = 0; ii < arguments.length; ii++) {
    var val = arguments[ii];
    var fn;
    var meta;
    // inspect type to determine where metadata will come from
    if (isFunction(val)) {
      fn = val;
      if (hasContract(fn)) {
        fnArray.push(fn);
        continue; // just add it to the set
      }
      meta = parseFnMetadata(val);
    } else if (isArray(val)) {
      ii++;
      if (ii >= arguments.length || !isFunction(arguments[ii])) {
        throw new Error(format(
          'Expected function after argument #{0}', [ii-1]));
      }
      meta = convertMetadata(val);
      fn = arguments[ii];
    } else if (isObject(val)) {
      ii++;
      if (ii >= arguments.length || !isFunction(arguments[ii])) {
        throw new Error(format(
          'Expected function after argument #{0}', [ii-1]));
      }
      meta = val;
      fn = arguments[ii];
    } else {
      throw new Error(format(
        'Invalid argument for multi-contract: {0}', [val]));
    }
    fnArray.push(makeContractWithMeta(meta, fn));
  }

  // don't union if there's only one contract
  if (fnArray.length == 1) {
    return fnArray[0];
  }

  // return a closure that calls the contracts in order
  return function() {
    return callContractUnion(fnArray, arguments);
  }
}


// test for annotation
var hasAnnotation = function(name) {
  return ('@' + name) in annotationRegistry;
};

// register single annotation
var registerAnnotation = function(name, fn) {
  annotationRegistry['@' + name] = fn;
};


// register multiple annotations with a single argument
var registerAnnotationMap = function(map) {
  for (var name in map) {
    registerAnnotation(name, map[name]);
  }
};

// apply contracts
makeContractShorthand = makeContractWithMeta(
  convertMetadata(['values', '@array', 'fn', '@function']),
  makeContractShorthand);

makeContractWithMeta = makeContractShorthand(
  ['meta', '@hash', 'fn', '@function'],
  makeContractWithMeta);

parseContract = makeContractShorthand(
  ['fn', '@function'],
  parseContract);

hasAnnotation = makeContractShorthand(
  ['name', '@string'],
  hasAnnotation);

registerAnnotation = makeContractShorthand(
  ['name', '@string', 'fn', '@function'],
  registerAnnotation);

registerAnnotationMap = makeContractShorthand(
  ['map', '@hash'],
  registerAnnotationMap);


// module definition
var oldModule = root.adidem;
var adidem = {
  ContractError: ContractError,

  hasContract: hasContract,

  hasAnnotation: hasAnnotation,

  contract: makeContractUnion(
      parseContract, makeContractWithMeta, makeContractShorthand),

  union: makeContractUnion,
  
  register: makeContractUnion(
      registerAnnotation, registerAnnotationMap),

  noConflict: function() {
    root.adidem = oldModule;
    return adidem;
  }
};

// export
if (typeof(exports) !== 'undefined') {
  if (typeof(module) !== 'undefined' && module.exports ) {
    module.exports = adidem;
  }
  exports.adidem = adidem;
} else {
  root.adidem = adidem;
}

}(this));
