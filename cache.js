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
