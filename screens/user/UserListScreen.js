"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, RefreshControl } from "react-native";
import { useToast } from "react-native-toast-notifications";
import User from "../../components/User";
import ListHeader from "../../components/ListHeader";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import { collection, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore";
import { Appbar, useTheme } from "react-native-paper";
import firestore from "../../firestore/firestore";
import useCachedData from "../../hooks/useCachedData";
import { useSnapshot } from "valtio";

const FETCH_SIZE = 10;

const UserListScreen = function({navigation, route}) {
  const { colors } = useTheme();
  
  const cached_data = useCachedData($);
  const snap_cached_data = useSnapshot(cached_data);

  const [cursor, set_cursor] = useState();
  const [is_refreshing, set_is_refreshing] = useState(false);
  const [is_refresh_error, set_is_refresh_error ] = useState(false);
  const [is_loading_more, set_is_loading_more] = useState(false);
  const [is_load_more_error, set_is_load_more_error] = useState(false);
  
  const toast = useToast();
  const uid = route.params.uid;

  useEffect(() => {
    refresh();
  }, []);
  
  const fetch = async function(cursor) {
    if (is_refreshing || is_loading_more) {
      return;
    }
    const q_relationship_args = [collection($.db, "relationship"), route.params.title === "Following" ? where("id", "==", uid) : where("uid", "==", uid), where("status", "==", "follow"), orderBy("updated_at", "desc"), limit(FETCH_SIZE)];
    if (cursor) {
      q_relationship_args.push(startAfter(cursor));
    }
    const q_relationship = query(...q_relationship_args);
    cursor ? set_is_loading_more(true) : set_is_refreshing(true);
    const relationships = [];
    try {
      const snap_relationship = await getDocs(q_relationship);
      _.each(snap_relationship.docs, function(doc_relationship) {
        relationships.push(doc_relationship.data());
      });
      const user_ids = await firestore.load_users({
        ids: route.params.title === "Following" ? _.pluck(relationships, "uid") : _.pluck(relationships, "id")
      });
      
      if (_.size(relationships) === 0 && !cursor) {
        cached_data.data = [];
      } else {
        if (cursor) {
          cached_data.data = cached_data.data .concat(user_ids);
        } else {
          cached_data.data = user_ids;
        }
      }
      if (_.size(user_ids) === FETCH_SIZE) {
        set_cursor(_.last(snap_relationship.docs));
      } else {
        set_cursor(null);
      }
    } catch (e) {
      console.log(e);
      cursor ? set_is_load_more_error(true) : set_is_refresh_error(true);
      $.display_error(toast, new Error("Failed to load users."));
    } finally {
      cursor ? set_is_loading_more(false) : set_is_refreshing(false);
    }    
  };
  
  const refresh = async () => {
    await fetch();
  };
  
  const fetch_more = async function() {
    if (!cursor) {
      return;
    }
    await fetch(cursor);
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };

  const render_user = function(row) {
    return <User uid={row.item} navigation={navigation}/>;
  };
  
  const on_press_retry = async function() {
    if (cursor) {
      await refresh();
    } else {
      await fetch(cursor);
    }
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title={route.params.title}  />
      </Appbar.Header>
      <FlatList
        style={{flex: 1}}
        keyboardShouldPersistTaps="always"
        data={snap_cached_data.data}
        renderItem={render_user}
        keyExtractor = { item => item }
        ListHeaderComponent = <ListHeader is_error={is_refresh_error} on_press_retry={on_press_retry}/>
        ListFooterComponent = <ListFooter is_error={is_load_more_error} is_loading_more={is_loading_more} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty data={snap_cached_data.data} text="No users found"/>
        refreshControl={
          <RefreshControl
            refreshing={is_refreshing}
            onRefresh={refresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
        onEndReached={fetch_more}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  );
};


export default UserListScreen;