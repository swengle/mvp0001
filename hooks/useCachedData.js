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
      }
      else {
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
    return useCachedData.cache_set(entity, cache_data);
  };

  const unshift_entity_already_in_cache = function(id) {
    useCachedData.unshift_entity_already_in_cache(id, cache_data);
  };

  const cache_get = function(id) {
    return entities[id];
  };

  const cache_get_snap = function(id) {
    return snap_entities[id];
  };

  return { cache_data, cache_snap_data: useSnapshot(cache_data), cache_sync, cache_reset, cache_set, cache_get, cache_get_snap, unshift_entity_already_in_cache };
};

useCachedData.cache_data_get = function(id) {
  return cached_datas_by_id[id];
};

useCachedData.cache_set = function(entity, cache_data) {
  if (!entity.id) {
    throw new Error("WTF");
  }
  if (entities[entity.id]) {
    _.extend(entities[entity.id], entity);
  }
  else {
    entities[entity.id] = entity;
  }

  if (cache_data && !cache_data.entity_ids[entity.id]) {
    cache_data.entity_ids[entity.id] = true;
    cache_data.pending.push(entity.id);
  }

  return entity;
};

useCachedData.cache_unset = function(id) {
  if (!entities[id]) {
    return;
  }
  _.each(cached_datas_by_id, function(cache_data) {
    if (cache_data.entity_ids[id]) {
      delete cache_data.entity_ids[id];
      cache_data.data = _.without(cache_data.data, function(d) {
        return d.id === id;
      });
    }
  });
  delete entities[id];
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
