import { proxy } from 'valtio';

class Cache {
  constructor() {
    this.data = proxy({});
    /*
    const me = this;
    setInterval(function() {
      console.log(me.data);
    }, 5000);
    */
  }
  
  set_user(user) {
    this.data[user.id] = user;
    console.log(user);
  }
  
  get(id) {
    return this.data[id];
  }
  
}

export default Cache;
