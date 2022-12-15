import _ from "underscore";
import { useState, useEffect } from 'react';
import { proxy, useSnapshot } from "valtio";

const metas = proxy({});
const entities = proxy({});

const useCachedData = function(options) {
  options = options || {};
  let id = options.id ? options.id : ("--" + Date.now());
  const [cache_data] = useState(metas[id] || proxy(_.extend(options, {id: id, data: null, entity_ids: {}, pending: []})));
  metas[id] = cache_data;

  const snap_entities = useSnapshot(entities);

  useEffect(() => {
    return function() {
      // might need to add some clean up in the future
    };
  }, []);

  const cache_sync = function() {
    if (_.size(cache_data.pending)) {
      if (cache_data.data === null || cache_data.is_refreshing) {
        cache_data.is_reset = false;
        cache_data.data = cache_data.pending;
      } else {
        cache_data.data = [...cache_data.data, ...cache_data.pending];
      }
      cache_data.pending = [];
    }
  };

  const cache_reset = function() {
    cache_data.entity_ids = {};
    cache_data.pending = [];
  };

  const cache_set = function(entity) {
    if (!entity.id) {
      throw new Error("WTF");
    }
    
    if (entities[entity.id]) {
      _.extend(entities[entity.id], entity);
    }
    else {
      entities[entity.id] = entity;
    }
    
    if (!cache_data.entity_ids[entity.id]) {
      cache_data.entity_ids[entity.id] = true;
      cache_data.pending.push(entity.id);
    }
    
    return entity;
  };

  const cache_get = function(id) {
    return entities[id];
  };

  const cache_get_snap = function(id) {
    return snap_entities[id];
  };

  return { cache_data, cache_snap_data: useSnapshot(cache_data), cache_sync, cache_reset, cache_set, cache_get, cache_get_snap };
};

useCachedData.cache_data_get = function(id) {
  return metas[id];
};

useCachedData.cache_set = function(entity) {
  if (!entity.id) {
    throw new Error("WTF");
  }
  if (entities[entity.id]) {
    _.extend(entities[entity.id], entity);
  }
  else {
    entities[entity.id] = entity;
  }
  return entity;
};

useCachedData.cache_get = function(id) {
  return entities[id];
};

useCachedData.cache_get_snap = function(id) {
  return (useSnapshot(entities))[id];
};


export default useCachedData;
