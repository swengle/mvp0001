"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect } from "react";
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

const FETCH_SIZE = 10;

const UserListScreen = function({navigation, route}) {
  const { colors } = useTheme();
  
  const {cache_data, cache_snap_data, cache_sync, cache_reset, cache_set} = useCachedData({
    is_refreshing: false,
    is_refresh_error: false,
    is_load_more_error: false,
    is_loading_more: false
  });
  
  const toast = useToast();
  const uid = route.params.uid;

  useEffect(() => {
    refresh();
  }, []);
  
  const fetch = async function(cursor) {
    if (cache_data.is_refreshing || cache_data.is_loading_more) {
      return;
    }
    const q_relationship_args = [collection($.db, "relationship"), route.params.title === "Following" ? where("id", "==", uid) : where("uid", "==", uid), where("status", "==", "follow"), orderBy("updated_at", "desc"), limit(FETCH_SIZE)];
    if (cache_data.cursor) {
      q_relationship_args.push(startAfter(cache_data.cursor));
    }
    const q_relationship = query(...q_relationship_args);
    cache_data.cursor ? cache_data.is_loading_more = true : cache_data.is_refreshing = true;
    const relationships = [];
    try {
      const snap_relationship = await getDocs(q_relationship);
      if (!cache_data.cursor) {
        cache_reset();
      }
      _.each(snap_relationship.docs, function(doc_relationship) {
        relationships.push(doc_relationship.data());
      });
      await firestore.load_users({
        ids: route.params.title === "Following" ? _.pluck(relationships, "uid") : _.pluck(relationships, "id")
      }, cache_set);
      
      if (_.size(snap_relationship.docs) === FETCH_SIZE) {
        cache_data.cursor = _.last(snap_relationship.docs);
      } else {
        cache_data.cursor = null;
      }
      cache_sync();
    } catch (e) {
      console.log(e);
      cache_data.is_loading_more  ? cache_data.is_load_more_error = true : cache_data.is_refresh_error = true;
      $.display_error(toast, new Error("Failed to load users."));
    } finally {
      cache_data.is_loading_more  ? cache_data.is_loading_more = false : cache_data.is_refreshing = false;
    }
  };
  
  const refresh = function() {
    cache_data.cursor = null;
    fetch();
  };
  
  const fetch_more = function() {
    if (!cache_data.cursor) {
      return;
    }
    fetch();
  };
  
  const on_press_retry = function() {
    fetch();
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };

  const render_user = function(row) {
    return <User uid={row.item} navigation={navigation}/>;
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
        data={cache_snap_data.data}
        renderItem={render_user}
        keyExtractor = { item => item }
        ListHeaderComponent = <ListHeader is_error={cache_snap_data.is_refresh_error} on_press_retry={on_press_retry}/>
        ListFooterComponent = <ListFooter is_error={cache_snap_data.is_load_more_error} is_loading_more={cache_snap_data.is_loading_more} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty data={cache_snap_data.data} text="No users found"/>
        refreshControl={
          <RefreshControl
            refreshing={cache_snap_data.is_refreshing}
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