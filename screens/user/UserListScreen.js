"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, RefreshControl } from "react-native";
import { useToast } from "react-native-toast-notifications";
import UserRow2 from "../../components/UserRow2";
import ListHeader from "../../components/ListHeader";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import { collection, doc, limit, orderBy, query, where, onSnapshot } from "firebase/firestore";
import { proxy } from "valtio";
import { Appbar, useTheme } from "react-native-paper";

const UserListScreen = function({navigation, route}) {
  const { colors } = useTheme();
  const [rows_by_id] = useState(proxy({}));
  const [data, set_data] = useState();
  const [is_refreshing, set_is_refreshing] = useState();
  const [is_refresh_error, set_is_refresh_error ] = useState();
  const [is_load_more_error, set_is_load_more_error] = useState();
  const toast = useToast();
  const user_id = route.params.user_id;
  let unsubscribe;
  const subscriptions = [];
  
  const possibly_unsubscribe = function() {
    unsubscribe && unsubscribe();
    _.each(subscriptions, function(end_subscription) {
      end_subscription();
    });
  };

  const refresh = async () => {
    possibly_unsubscribe();
    const q = query(collection($.db, "relationship"), route.params.title === "Following" ? where("id", "==", user_id) : where("user_id", "==", user_id), where("status", "==", "follow"), orderBy("updated_at", "desc"), limit(32) );
    try {
      set_is_refreshing(true);
      const user_ids = [];
      const rows = [];
      const added_to_rows = {};
      const done = {};
      let is_first = true;
      unsubscribe = onSnapshot(q, (snapshot_relationship) => {
        if (is_first && snapshot_relationship.size === 0) {
          set_is_refreshing(false);
          set_data([]);
          return;
        } else {
          is_first = false;
        }
        snapshot_relationship.docChanges().forEach((change) => {
          // change.type can be added, modified, removed
          if (change.type === "added") {
            //console.log("added", change.doc.data());
            const relationship = change.doc.data();
            user_ids.push(relationship.user_id);
            subscriptions.push(onSnapshot(doc($.db, "user", (relationship.user_id == user_id) ? relationship.id : relationship.user_id), (snapshot_user) => {
              const user = snapshot_user.data();
              rows_by_id[user.id] = {id: user.id, user: user, relationship: relationship};
              if (!added_to_rows[user.id]) {
                added_to_rows[user.id] = true;
                rows.push({ id: user.id });
              }
              done[relationship.user_id] = true;
              if (_.size(done) === _.size(user_ids)) {
                set_is_refreshing(false);
                set_data(rows); 
              }
            }));
          } else if (change.type === "modified") {
            //console.log("modified", change.doc.data());
          } else if (change.type === "removed") {
            //console.log("removed", change.doc.data());
          }
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
    return possibly_unsubscribe;
  }, []);
  
  const on_press_back = function() {
    navigation.goBack();
  };

  const render_user = function(row) {
    return <UserRow2 row_id={row.item.id} navigation={navigation} rows_by_id={rows_by_id}/>;
  };
  
  const on_press_retry = async function() {
    await refresh();
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
        data={data}
        renderItem={render_user}
        keyExtractor = { item => item.id }
        ListHeaderComponent = <ListHeader is_error={is_refresh_error} on_press_retry={on_press_retry}/>
        ListFooterComponent = <ListFooter is_error={is_load_more_error} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty data={data} text="No users found"/>
        refreshControl={
          <RefreshControl
            refreshing={is_refreshing}
            onRefresh={refresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
      />
    </SafeAreaView>
  );
};


export default UserListScreen;