const errors = [
  () => btoa('💖'),
  () => new Headers({'a': '💖'}),
  () => fetch('http://[::1]/', { headers: {'a': '💖'} }),
  () => document.createElement('div').setAttribute('invalid=name', '1')
];
for(let e of errors) {
  try { e() } catch(err) { console.log(e.toString(), err.name, err.message) }
}
