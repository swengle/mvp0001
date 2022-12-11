"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, RefreshControl } from "react-native";
import Header from "../../components/Header";
import { useToast } from "react-native-toast-notifications";
import UserRow2 from "../../components/UserRow2";
import ListHeader from "../../components/ListHeader";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import { collection, doc, limit, query, where, onSnapshot } from "firebase/firestore";
import { proxy, useSnapshot } from "valtio";

const UserListScreen = function({navigation, route}) {
  const [rows_by_id] = useState(proxy({}));
  const rows_by_id_snap = useSnapshot(rows_by_id);
  const [data, set_data] = useState();
  const [is_refresh_error, set_is_refresh_error ] = useState();
  const [is_load_more_error, set_is_load_more_error] = useState();
  const toast = useToast();
  const user_id = route.params.user_id;
  let unsubscribe;
  const subscriptions = [];
  let is_first = true;

  const refresh = async () => {
    const q = query(collection($.db, "relationship"), route.params.title === "Following" ? where("id", "==", user_id) : where("user_id", "==", user_id), route.params.title === "Following" ? where("status", "==", "follow") : where("status", "==", "follow_by"), limit(32) );
    try {
      const user_ids = [];
      const rows = [];
      const done = {};
      unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (is_first) {
          is_first = false;
          if (querySnapshot.size === 0) {
            set_data([]);
            return;
          }
        }
        querySnapshot.forEach((doc_relationship) => {
          const relationship = doc_relationship.data();
          user_ids.push(relationship.user_id);
            subscriptions.push(onSnapshot(doc($.db, "user", relationship.user_id), (doc_user) => {
              const user = doc_user.data();
              if (!rows_by_id[user.id]) {
                rows_by_id[user.id] = {id: user.id, user: user, relationship: relationship};
                rows.push({ id: user.id });
              } else {
                rows_by_id[user.id] = {id: user.id, user: user, relationship: relationship};
              }
              done[relationship.user_id] = true;
              if (_.size(done) === _.size(user_ids)) {
                set_data(rows); 
              }
            }));
        });
        
      });
    } catch (e) {
      set_data(null);
      set_is_refresh_error(true);
      $.display_error(toast, new Error("Failed to load users."));
    }
  };
    
  useEffect(() => {
    refresh();
    return function() {
      unsubscribe && unsubscribe();
      _.each(subscriptions, function(end_subscription) {
        end_subscription();
      });
    };
  }, []);
  
  const on_press_back = function() {
    navigation.goBack();
  };

  const render_user = function(row) {
    return <UserRow2 row_id={row.item.id} navigation={navigation} rows_by_id={rows_by_id} rows_by_id_snap={rows_by_id_snap}/>;
  };
  
  const on_press_retry = async function() {
    await refresh();
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Header title={route.params.title} on_press_back={on_press_back}/>
      <FlatList
        style={{flex: 1}}
        keyboardShouldPersistTaps="always"
        data={data}
        renderItem={render_user}
        keyExtractor = { item => item.id }
        ListHeaderComponent = <ListHeader is_error={is_refresh_error} on_press_retry={on_press_retry}/>
        ListFooterComponent = <ListFooter is_error={is_load_more_error} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty data={data} text="No users found"/>
        /*
        ListHeaderComponent = <ListHeader is_error={snap_fetcher.refresh_error} on_press_retry={on_press_retry}/>
        
        ListEmptyComponent = <ListEmpty text="No users found"/>
        refreshControl={
          <RefreshControl
            refreshing={snap_fetcher.is_refreshing}
            onRefresh={refresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
        */
      />
    </SafeAreaView>
  );
};


export default UserListScreen;