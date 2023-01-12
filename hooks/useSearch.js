import $ from "../setup";
import _ from "underscore";
import { useState, useEffect } from 'react';
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import useGlobalCache from "../hooks/useGlobalCache";

const useSearch = function() {
  const [search_data, set_search_data] = useState({data: undefined, is_group_enabled: {}});
  const [is_searching, set_is_searching] = useState(false);
  const [is_searching_error, set_is_searching_error] = useState(false);
  const { cache_set_users } = useGlobalCache();
  
  useEffect(() => {
    return function() {
      // might need to add some clean up in the future
    };
  }, []);
  
  const search_clear = function() {
    delete search_data.data;
  };
  
  const search_users = async function(search_text) {
    const search_text_length = search_text.length;
    const str_front_code = search_text.slice(0, search_text_length-1);
    const str_end_code = search_text.slice(search_text_length-1, search_text.length);
    
    const start_code = search_text;
    const end_code= str_front_code + String.fromCharCode(str_end_code.charCodeAt(0) + 1);
    const q = query(collection($.db, "users"), where("username", ">=", start_code), where("username", "<", end_code), limit(20));
    set_search_data({data: undefined});
    set_is_searching_error(false);
    if (!search_text || search_text.length === 0) {
      return;
    }
    set_is_searching(true);
    try {
      const snap_users = await getDocs(q);
      const size = _.size(snap_users.docs);
      if (size === 0) {
        set_search_data({data: []});
      } else {
        const users = [];
        _.each(snap_users.docs, function(doc) {
          users.push(doc.data());
        });
        set_search_data({data: cache_set_users(users)});
      }
    } catch (e) {
      $.logger.error(e);
      set_is_searching_error(true);
    } finally {
      set_is_searching(false);
    }
  };
  
  const search_emojis = async function(search_text) {
    set_search_data({data: undefined, is_group_enabled: {}});
    set_is_searching_error(false);
    if (!search_text || search_text.length === 0) {
      return;
    }
    set_is_searching(true);
    try {
      const is_group_enabled = {};
      const result = [];
      _.each($.emoji_data, function(emoji_data) {
        delete emoji_data.parts_by_keyword;
        let is_candidate = false;
        _.each(emoji_data.keywords, function(keyword) {
          if (keyword.indexOf(search_text) === 0) {
            is_candidate = true;
            if (!emoji_data.parts_by_keyword) {
              emoji_data.parts_by_keyword = {};
            }
            emoji_data.parts_by_keyword[keyword] = {parts: keyword.split(new RegExp(`(${search_text})`, 'gi'))};
            _.each(emoji_data.parts_by_keyword[keyword].parts, function(part, index) {
              if (part === search_text) {
                emoji_data.parts_by_keyword[keyword].part_index = index;
              }
            });
          }
        });
        if (is_candidate) {
          is_group_enabled[emoji_data.group] = true;
          result.push(emoji_data); 
        }
      });
      
      set_search_data({data: result, is_group_enabled: is_group_enabled});
    } catch (e) {
      $.logger.error(e);
      set_is_searching_error(true);
    } finally {
      set_is_searching(false);
    }
  };


  return { search_data, search_clear, search_users, search_emojis, is_searching, is_searching_error };
};

export default useSearch;
