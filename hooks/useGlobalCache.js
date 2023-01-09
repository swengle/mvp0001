import _ from "underscore";
import { proxy, useSnapshot } from "valtio";

let entities = proxy({});
let fetchers = {};

const useGlobalCache = function() {

  const cache_set_users = function(users) {
    const users_array = _.isArray(users) ? users : [users];
    const result = [];
    _.each(users_array, function(user) {
      if (user.current_post) {
        user.current_post = cache_set_posts(user.current_post);
      }
      entities[user.id] = user;
      result.push({ id: user.id });
    });
    
    return _.isArray(users) ? result : result[0];
  };
  
  const cache_set_posts = function(posts) {
    const posts_array = _.isArray(posts) ? posts : [posts];
    const result = [];
    _.each(posts_array, function(post) {
      if (post.user) {
        post.user = cache_set_users(post.user);
      }
      entities[post.id] = post;
      result.push({ id: post.id, created_at_time: post.created_at.toDate().getTime() });
    });
    
    return _.isArray(posts) ? result : result[0];
  };
  
  const cache_set_comments= function(comments) {
    const comments_array = _.isArray(comments) ? comments : [comments];
    const result = [];
    _.each(comments_array, function(comment) {
      if (comment.user) {
        comment.user = cache_set_users(comment.user);
      }
      entities[comment] = comment;
      result.push({ id: comment.id });
    });
    
    return _.isArray(comments) ? result : result[0];
  };
  
  const cache_get = function(id) {
    return entities[id];
  };
  
  const cache_get_snapshot = function(id) {
    return (useSnapshot(entities))[id];
  };
  
  const cache_get_fetcher = function(id) {
    if (!fetchers[id]) {
      fetchers[id] = proxy({
        id: id,
        default: {
          data: null,
          is_first_refresh: true,
          is_refreshing: false,
          is_refresh_error: false,
          is_load_more_error: false,
          is_loading_more: false
        }
      });
    }
    return fetchers[id];
  };
  
  const cache_get_fetcher_snapshot = function(id) {
    return useSnapshot(fetchers[id]);
  };
  
  const flush_all = function() {
    entities = proxy({});
    fetchers = {};
  };
  
  return { cache_set_users, cache_set_posts, cache_set_comments, cache_get, cache_get_snapshot, cache_get_fetcher, cache_get_fetcher_snapshot, flush_all };
};


useGlobalCache.cache_get = function(id) {
  return entities[id];
};

useGlobalCache.cache_get_snapshot = function(id) {
  return (useSnapshot(entities))[id];
};


export default useGlobalCache;
