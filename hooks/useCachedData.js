import { useState, useEffect } from 'react';
import { proxy } from "valtio";

const useCachedData = function($, id) {
  const [cache_data] = useState(proxy({id: id ? id : ("--" + Date.now()), data: null}));
  $.data_cache.set(cache_data);
  
  useEffect(() => {
    return function() {
      $.data_cache.unset(cache_data);
    };
  }, []);

  return cache_data;
};

export default useCachedData;