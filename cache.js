import _ from "underscore";
import { proxy, useSnapshot } from 'valtio';

class Cache {
  constructor() {
    this.data = proxy({});
  }
  
  set_user(user) {
    if (this.data[user.id]) {
      _.extend(this.data[user.id], user); 
    } else {
      this.data[user.id] = user;
    }
  }
  
  set_post(post) {
    if (this.data[post.id]) {
      _.extend(this.data[post.id], post); 
    } else {
      this.data[post.id] = post;
    }
  }
  
  get_snap(id) {
    if (!id) {
      return useSnapshot(this.data);
    }
    return useSnapshot(this.data[id]);
  }
  
  get(id) {
    return this.data[id];
  }
  
}

export default Cache;
