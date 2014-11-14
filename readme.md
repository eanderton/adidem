Ad Idem
=======

Ad Idem is an Annotation-Based Design by Contract Library, for JavaScript.

> Ad Idem - law: in agreement or at a meeting of minds on a point
>
> : at one -used in reference to the making of a contract.
>
> ~ Merriam-Webster Online

Example
-------

Ad Idem looks for *annotations* in comments within your function definition, and wraps the function with a contract, based on those annotations.

```
adidem = require('adidem')

var add = adidem.contract(
  function(a /*@number*/, b /*@number*/) {
    return a + b;
  }
);
```

In this example, 'add' will add two numbers if, and only if, two numbers are provided as arguments. It will throw an exception if the input arguments are any other type. 

```
console.log( add(42, 69) );
//-> 111

console.log( add("foo", "bar") );
// throws ContractException since the argument types are invalid
```

Annotations are also supported on the return type.
```
// ensure that 'process' returns anything but 'undefined'
var process = adidem.contract(
  function() /*@defined*/ {
    return doProcess.apply(this, arguments);
  }
);
```

Multiple contracts may be unioned together to give the appearance of a single function that responds to different input types.  The contracts are tested, in order, until one matches the input values.
```
// make a type-response concat() function
var concat = adidem.union(
  function(dst /*@array*/, src /*@array*/) {
    return dst.concat(src);
  },
  function(dst /*@array*/, src) {
    return dst.concat([src]);
  },
  function(dst /*@string*/, src) {
    return dst += src;
  },
  function(dst /*@hash*/, src /*@hash*/) {
    // use lodash's clone() and merge() on both of these non-array objects (@hash)
    return _.merge(_.clone(dst), src);
  },
  function(dst, src) {
    // all other arg combinaitons generate an error
    throw new Error('Cannot concat ' + typeof(dst) + ' to ' + typeof(src));
  }
);

console.log( concat([1,2,3],[4,5,6]) );
//-> [1,2,3,4,5,6]

console.log( concat([1,2,3], 4) );
//-> [1,2,3,4]

console.log( concat('hello ', 'world') );
//-> 'hello world'

console.log( concat({'foo': 'bar'}, {'baz': 'gorf'}) );
//-> {'foo': 'bar', 'baz': 'gorf'}

console.log( concat({}, 'foobar') );
// throws ContractError since this arg type combination is not supported
```

Custom Annotations can be added to the runtime, allowing for even more flexibility.
```
// validate that an argument is of type 'frob'
adidem.register('frob', function(value) {
  return typeof(value) === 'Frob';
});

// when called, frobinate() will only allow a type of 'Frob' as an argument.
var frobinate = adidem.contract(
  function(frobObj /*@frob*/) {
    return frobObj.doFrob();
  }
);
```
