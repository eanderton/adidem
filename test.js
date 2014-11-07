/*
  Ad Idem: Design by Contract Library for JavaScript
  - Unit Tests  

Copyright (c) 2014, Eric Anderton
All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1) Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2) Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3) Neither the name of the ORGANIZATION nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function(){ 'use strict';

var adidem = require('./adidem.js');

// Test Support
// ------------

function testContractFailure(fn, argsets, test) {
  var adidem = require('./adidem.js');

  for (var ii in argsets) {
    var argset = argsets[ii];
    test.throws(function() {
        fn.apply(fn, argset);
      }, adidem.ContractError, 
      'TestContractFailure ' + (ii+1) + ' of ' + argsets.length);
  }
}

exports.setUp = function(callback) {
  // re-load the library each time
  adidem = require('./adidem.js');
  callback();
};

exports.tearDown = function(callback) {
  callback();
};


// Annotations
// -----------

exports.testRegisterAnnotation = function(test) {
  adidem.register('foo', function() {});

  test.ok(adidem.hasAnnotation('foo'));
  test.done();
};

exports.testRegisterAnnotationMap = function(test) {
  adidem.register({
    foo: function() {},
    bar: function() {}
  });

  test.ok(adidem.hasAnnotation('foo'));
  test.ok(adidem.hasAnnotation('bar'));
  test.done();
};

exports.testRegisterAnnotationContracts = function(test) {
  testContractFailure(adidem.register, [
    [],
    [123],
    ['foo'],
    ['foo', 'bar'],
    [[]],
    [function(){}],
  ], test);
  test.done();
};


// Contract Generation
// -------------------

exports.testContractParse = function(test) {
  var fn = adidem.contract(function(/*@defined*/ foo /*@number*/,
        /*@notnull*/  bar //@number
        ) /*@number @safe*/ {
    return foo + bar;
  });
  
  test.deepEqual(fn._meta, {
    names: ['foo', 'bar'],
    params: { foo: ['@defined', '@number'], bar: ['@notnull', '@number'] },
    retval: ['@number', '@safe']
  });
  test.equal(fn(42, 69), 111);
  testContractFailure(adidem.register, [
    [],
    [undefined, null],
    [123, null],
    [undefined, 456],
    ['hello'],
    ['hello', 'world'],
  ], test);

  test.done(); 
};

exports.testContractMakeShorthand = function(test) {
  var fn = adidem.contract([
    'foo', '@defined', '@number',
    'bar', '@notnull', '@number',
    'return', '@number', '@safe'
  ], function(foo, bar) {
    return foo + bar;
  });
  
  test.deepEqual(fn._meta, {
    names: ['foo', 'bar'],
    params: { foo: ['@defined', '@number'], bar: ['@notnull', '@number'] },
    retval: ['@number', '@safe']
  });
  test.equal(fn(42, 69), 111);
  testContractFailure(adidem.register, [
    [],
    [undefined, null],
    [123, null],
    [undefined, 456],
    ['hello'],
    ['hello', 'world'],
  ], test);

  test.done(); 
};

exports.testContractMakeMeta = function(test) {
  var meta = {
    names: ['foo', 'bar'],
    params: { foo: ['@defined', '@number'], bar: ['@notnull', '@number'] },
    retval: ['@number', '@safe']
  };

  var fn = adidem.contract(meta, function(foo, bar) {
    return foo + bar;
  });
  
  test.deepEqual(fn._meta, meta);
  test.equal(fn(42, 69), 111);
  testContractFailure(adidem.register, [
    [],
    [undefined, null],
    [123, null],
    [undefined, 456],
    ['hello'],
    ['hello', 'world'],
  ], test);

  test.done(); 
};

// Multi-Contract Generation
// --------------------------

exports.testMultiContractParse = function(test) {
  var fn = adidem.multi(
    function(a /*@number*/, b /*@number*/) /*@number*/ {
      return a + b;
    },
    function(a /*@string*/, b /*@string*/) /*@string*/ {
      return a + b;
    });

  test.equal(fn(42, 69), 111);
  test.equal(fn('foo', 'bar'), 'foobar');

  test.done();
};

exports.testMultiContractShorthand = function(test) {
  var fn = adidem.multi(
    ['a', '@number', 'b', '@number', 'return', '@number'],
    function(a, b) {
      return a + b;
    },
    ['a', '@string', 'b', '@string', 'return', '@string'],
    function(a, b) {
      return a + b;
    });

  test.equal(fn(42, 69), 111);
  test.equal(fn('foo', 'bar'), 'foobar');

  test.done();
};

exports.testMultiContractMeta = function(test) {
  var fn = adidem.multi({
      names: ['a', 'b'],
      params: { a: ['@number'], b: ['@number'] },
      retval: ['@number']
    }, function(a, b) {
      return a + b;
    }, {
      names: ['a', 'b'],
      params: { a: ['@string'], b: ['@string'] },
      retval: ['@string']
    }, function(a, b) {
      return a + b;
    });

  test.equal(fn(42, 69), 111);
  test.equal(fn('foo', 'bar'), 'foobar');

  test.done();
};

})();  // end module
