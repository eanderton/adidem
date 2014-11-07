var contract = require('./contract.js');
//contract.USE_CONTRACTS = false;

contract.register({
  number: function(value){
    return typeof value === 'number'; 
  },

  integer: function(value){ 
    return typeof value === 'number' && 
      value >= 0 && 
      parseInt(value) == value; 
  },

  defined: function(value){
    return value !== undefined;
  }
});

function testFunction( foo /*@integer */ , bar /*@defined*/, baz /*@number*/) /*@number*/ {
  console.log("called function with bar:", bar);
  return foo + baz;
}

var annotated = contract.make(testFunction);
console.log("meta:", annotated._meta);
console.log(
  "call:", annotated(123, null, 456)
);
