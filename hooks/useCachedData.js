import _ from "underscore";
import { useState, useEffect } from 'react';
import { proxy, useSnapshot } from "valtio";

const cached_datas_by_id = proxy({});
const entities = proxy({});

const useCachedData = function(options) {
  options = options || {};
  let id = options.id ? options.id : ("--" + Date.now());
  const [cache_data] = useState(cached_datas_by_id[id] || proxy(_.extend(options, { id: id, data: null, entity_ids: {}, pending: [] })));
  cached_datas_by_id[id] = cache_data;

  useEffect(() => {
    return function() {
      // might need to add some clean up in the future
    };
  }, []);

  const cache_sync = function(index) {
    useCachedData.cache_sync(cache_data, index);
  };

  const cache_reset = function() {
    useCachedData.cache_reset(cache_data);
  };
  
  const cache_empty = function() {
    useCachedData.cache_empty(cache_data);
  };

  const cache_set = function(entity, options) {
    return useCachedData.cache_set(entity, cache_data, options);
  };

  const unshift_entity_already_in_cache = function(id) {
    useCachedData.unshift_entity_already_in_cache(id, cache_data);
  };

  const cache_get = function(id) {
    return useCachedData.cache_get(id);
  };

  const cache_get_snap = function(id) {
    return useCachedData.cache_get_snap(id);
  };

  return { cache_data, cache_snap_data: useSnapshot(cache_data), cache_sync, cache_reset, cache_empty, cache_set, cache_get, cache_get_snap, unshift_entity_already_in_cache };
};

useCachedData.cache_data_get = function(id) {
  return cached_datas_by_id[id];
};

useCachedData.cache_set = function(entity, cache_data, options) {
  if (!entity.id) {
    throw new Error("WTF");
  }
  if (entities[entity.id] && false) {
    _.extend(entities[entity.id], entity);
  }
  else {
    entities[entity.id] = entity;
  }

  if (cache_data && !cache_data.entity_ids[entity.id]) {
    cache_data.entity_ids[entity.id] = true;
    if (options && options.is_skip_pending) {
      if (!_.isArray(cache_data.data)) {
        cache_data.data = [];
      }
      if (options && _.isNumber(options.index)) {
        cache_data.data.splice(options.index, 0, entity.id);
      } else {
        cache_data.data.push(entity.id); 
      }
    } else {
      if (options && _.isNumber(options.index)) {
        cache_data.pending.splice(options.index, 0, entity.id);
      } else {
        cache_data.pending.push(entity.id); 
      }
    }
  }
  return entity;
};

useCachedData.cache_reset = function(cache_data) {
  cache_data.entity_ids = {};
  cache_data.pending = [];
};

useCachedData.cache_empty = function(cache_data) {
  useCachedData.cache_reset(cache_data);
  cache_data.data = [];
};

useCachedData.cache_unset = function(id) {
  if (!entities[id]) {
    return;
  }
  _.each(cached_datas_by_id, function(cache_data) {
    if (cache_data.entity_ids[id]) {
      delete cache_data.entity_ids[id];
      cache_data.data = _.reject(cache_data.data, function(d) {
        return d === id;
      });
    }
  });
  delete entities[id];
};

useCachedData.cache_sync = function(cache_data, index) {
  if (_.size(cache_data.pending)) {
    if (cache_data.data === null || cache_data.is_refreshing) {
      cache_data.is_reset = false;
      cache_data.data = cache_data.pending;
    }
    else {
      if (_.isNumber(index)) {
        cache_data.data.splice(index, 0, ...cache_data.pending);
      } else {
        cache_data.data = [...cache_data.data, ...cache_data.pending];
      }
    }
    cache_data.pending = [];
  }
};

useCachedData.unshift_entity_already_in_cache = function(id, cache_data) {
  if (!entities[id]) {
    return;
  }
  if (!cache_data.entity_ids[id]) {
    cache_data.entity_ids[id] = true;
    cache_data.data.unshift(id);
  }
};

useCachedData.cache_get = function(id) {
  return entities[id];
};

useCachedData.cache_get_snap = function(id) {
  return (useSnapshot(entities))[id];
};


export default useCachedData;
