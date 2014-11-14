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

var adidem;


beforeEach(function() {
  if( typeof adidem === 'undefined' ) {
    adidem = require('../adidem');
  }
});


describe("register annotation", function() {
  it("should register 'foo'", function() {
    adidem.register('foo', function() {});

    expect(adidem.hasAnnotation('foo'));
  });

  it("should register 'foo' and 'bar'", function() {
    adidem.register({
      bar: function() {},
      baz: function() {}
    });

    expect(adidem.hasAnnotation('bar'));
    expect(adidem.hasAnnotation('baz'));
  });

  it("should fail with bad arguments", function() {
    expect(function() { adidem.register(); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "name", does not satisfy @string: undefined'   
    ));

    expect(function() { adidem.register(123); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "name", does not satisfy @string: 123'   
    ));
    
    expect(function() { adidem.register('foo'); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "fn", does not satisfy @function: undefined'   
    ));
    
    expect(function() { adidem.register('foo', 'bar'); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "fn", does not satisfy @function: "bar"'   
    ));
    
    expect(function() { adidem.register(function(){}); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "name", does not satisfy @string: function'   
    ));
  });
});



describe("contract generation", function() {
  it("should handle inline annotations", function() {
    var fn = adidem.contract(function(/*@defined*/ foo /*@number*/,
          /*@notnull*/  bar //@number
          ) /*@number @safe*/ {
      return foo + bar;
    });

    expect(fn._meta).toEqual({
      names:  ['foo', 'bar'],
      params: { foo: ['@defined', '@number'], bar: ['@notnull', '@number'] },
      retval: ['@number', '@safe']
    });
    expect(fn(42, 69)).toBe(111);
  });
  
  it("should handle shorthand annotations", function() {
    var fn = adidem.contract([
      'foo', '@defined', '@number',
      'bar', '@notnull', '@number',
      'return', '@number', '@safe'
    ], function(foo, bar) {
      return foo + bar;
    });

    expect(fn._meta).toEqual({
      names:  ['foo', 'bar'],
      params: { foo: ['@defined', '@number'], bar: ['@notnull', '@number'] },
      retval: ['@number', '@safe']
    });
    expect(fn(42, 69)).toBe(111);
  });

  it("should handle metadata annotations", function() {
    var meta = {
      names:  ['foo', 'bar'],
      params: { foo: ['@defined', '@number'], bar: ['@notnull', '@number'] },
      retval: ['@number', '@safe']
    }

    var fn = adidem.contract(meta, function(foo, bar) {
      return foo + bar;
    }); 
    
    expect(fn._meta).toEqual(meta);
    expect(fn(42, 69)).toBe(111);
  });

  it("should reject bad arguments", function() {
    expect(function() { adidem.contract(); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "fn", does not satisfy @function: undefined'   
    ));

    expect(function() { adidem.contract(undefined, null); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "fn", does not satisfy @function: undefined'   
    ));

    expect(function() { adidem.contract(123, null); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "fn", does not satisfy @function: 123'   
    ));

    expect(function() { adidem.contract(undefined, 456); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "fn", does not satisfy @function: undefined'   
    ));

    expect(function() { adidem.contract('hello'); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "fn", does not satisfy @function: "hello"'   
    ));

    expect(function() { adidem.contract('hello', 'world'); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "fn", does not satisfy @function: "hello"'   
    ));
    
    expect(function() { adidem.contract([], 'world'); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "fn", does not satisfy @function: "world"'   
    ));
    
    expect(function() { adidem.contract({}, false); })
    .toThrow(new adidem.ContractError(
      'Argument for parameter "fn", does not satisfy @function: false'   
    ));
  });
});


describe("contract union generation", function() {
  it("should handle inline annotations", function() {
    var fn = adidem.union(
      function(a /*@number*/, b /*@number*/) /*@number*/ {
        return a - b;
      },
      function(a /*@string*/, b /*@string*/) /*@string*/ {
        return a + b;
      });

    expect(fn(69, 42)).toBe(27);
    expect(fn('foo', 'bar')).toBe('foobar');
  });

  it("should handle shorthand annotations", function() {
    var fn = adidem.union(
      ['a', '@number', 'b', '@number', 'return', '@number'],
      function(a, b) {
        return a - b;
      },
      ['a', '@string', 'b', '@string', 'return', '@string'],
      function(a, b) {
        return a + b;
      });

    expect(fn(69, 42)).toBe(27);
    expect(fn('foo', 'bar')).toBe('foobar');
  });
  
  it("should handle metadata annotations", function() {
    var fn = adidem.union({
      names: ['a', 'b'],
      params: { a: ['@number'], b: ['@number'] },
      retval: ['@number']
    }, function(a, b) {
      return a - b;
    }, {
      names: ['a', 'b'],
      params: { a: ['@string'], b: ['@string'] },
      retval: ['@string']
    }, function(a, b) {
      return a + b;
    });

    expect(fn(69, 42)).toBe(27);
    expect(fn('foo', 'bar')).toBe('foobar');
  });
});


describe("functions", function() {
  it("can be interrogated for contract presence", function() {
    var normalFn =
        function(foo /*@string*/, bar /*@number*/){};
    var contractFn = adidem.contract(normalFn);

    expect(adidem.hasContract(contractFn));
    expect(adidem.hasContract(normalFn)).toBe(false);
  });
});

})();  // end module

