"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, RefreshControl } from "react-native";
import { useToast } from "react-native-toast-notifications";
import ListHeader from "../../components/ListHeader";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import { collection, getDocs, limit, query, startAfter, where, onSnapshot, orderBy } from "firebase/firestore";
import { proxy } from "valtio";
import { Appbar, useTheme } from "react-native-paper";
import Post from "../../components/Post";

const FETCH_SIZE = 10;

const HistoryScreen = function({navigation, route}) {
  const { colors } = useTheme();
  const [rows_by_id] = useState(proxy({}));
  const [data, set_data] = useState();
  const [cursor, set_cursor] = useState();

  const [is_refreshing, set_is_refreshing] = useState();
  const [is_refresh_error, set_is_refresh_error ] = useState();
  
  const [is_load_more_error, set_is_load_more_error] = useState();
  const [is_loading_more, set_is_loading_more] = useState();
  const toast = useToast();
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
    const q = query(collection($.db, "post"), where("user_id", "==", $.session.uid), orderBy("created_at", "desc"), limit(FETCH_SIZE) );
    try {
      set_is_refreshing(true);
      let rows = [];
      let is_first = true;
      let is_initial_rows = true;
      unsubscribe = onSnapshot(q, (snapshot_post) => {
        if (is_first && snapshot_post.size === 0) {
          set_is_refreshing(false);
          set_data([]);
          return;
        } else {
          is_first = false;
        }
        snapshot_post.docChanges().forEach((change) => {
          // change.type can be added, modified, removed
          if (change.type === "added") {
            const post = change.doc.data();
            rows_by_id[post.id] = {id: post.id, post: post};
            rows.push({ id: post.id, created_at: post.created_at });
          } else if (change.type === "modified") {
            //console.log("modified", change.doc.data());
          } else if (change.type === "removed") {
            //console.log("removed", change.doc.data());
          }
        });
        set_is_refreshing(false);
        rows = _.sortBy(rows, function(r) {
          return r.created_at;
        });
        rows.reverse();
        if (is_initial_rows) {
          is_initial_rows = false;
          if (_.size(rows) === FETCH_SIZE) {
            set_cursor(_.last(rows));
          }
        }
        set_data([...rows]);
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
  
  const fetch_more = async function() {
    if (!is_loading_more && cursor) {
      set_is_loading_more(true);
      try {
        const q = query(collection($.db, "post"), where("user_id", "==", $.session.uid), orderBy("created_at", "desc"), limit(FETCH_SIZE), startAfter(cursor.created_at) );
        const query_snapshot = await getDocs(q);
        const rows = [];
        query_snapshot.forEach((doc) => {
          const post = doc.data();
          rows_by_id[post.id] = {id: post.id, post: post};
          rows.push({ id: post.id, created_at: post.created_at });
        });
        if (_.size(rows) === FETCH_SIZE) {
          set_cursor(_.last(rows));
        } else {
          set_cursor(null);
        }
        set_data([...data, ...rows]);
      } catch (e) {
        console.log(e);
        set_is_load_more_error(true);
      } finally {
        set_is_loading_more(false);
      }
    }
  };
  
  const on_press_retry = async function() {
    await refresh();
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const render_post = function(row) {
    return <Post navigation={navigation} row_id={row.item.id} rows_by_id={rows_by_id}/>;
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title="History" />
      </Appbar.Header>
      <FlatList
        style={{flex: 1}}
        keyboardShouldPersistTaps="always"
        data={data}
        renderItem={render_post}
        keyExtractor = { item => item.id }
        ListHeaderComponent = <ListHeader is_error={is_refresh_error} on_press_retry={on_press_retry}/>
        ListFooterComponent = <ListFooter is_error={is_load_more_error} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty data={data} text="No posts found"/>
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
        onEndReachedThreshold={2}
      />
    </SafeAreaView>
  );
};


export default HistoryScreen;