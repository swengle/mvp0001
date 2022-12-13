import _ from "underscore";
import { proxy, useSnapshot } from 'valtio';

class Cache {
  constructor() {
    this.data = proxy({});
  }
  
  set(entity) {
    if (!entity.id) {
      throw new Error("WTF");
    }
    if (this.data[entity.id]) {
      _.extend(this.data[entity.id], entity); 
    } else {
      this.data[entity.id] = entity;
    }
  }
  
  unset(id) {
    delete this.data[_.isObject(id) ? id.id : id];
  }
  
  get_snap() {
    return useSnapshot(this.data);
  }
  
  get(id) {
    return this.data[id];
  }
  
}

export default Cache;
