"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, View } from 'react-native';
import { Appbar, Badge, List, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, limit, query, startAfter, orderBy } from "firebase/firestore";
import useGlobalCache from "../../hooks/useGlobalCache";
import { useToast } from "react-native-toast-notifications";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";

const AlertsListHeader = function({navigation}) {
  const { colors } = useTheme();
  const snap_user = $.get_snap_current_user();
  
  const on_press_friend_requests = function() {
    navigation.push("UserListScreen", {screen: "RequestByScreen"});
  };
  
  if (_.isNumber(snap_user.request_by_count) && snap_user.request_by_count > 0) {
    return (
      <View style={{marginLeft: 10}}>
        <List.Section>
          <List.Item
            title={"Friend Requests"}
            left={(_.isNumber(snap_user.request_by_count) && snap_user.request_by_count > 0) ? props => <View style={{flexDirection: "row"}}>{(_.isNumber(snap_user.unread_request_by_count) && snap_user.unread_request_by_count > 0) && <Badge style={{marginRight: 8}}>{snap_user.unread_request_by_count}</Badge>}<Badge style={{backgroundColor: colors.text}}>{snap_user.request_by_count}</Badge></View> : null}
            right={props => <List.Icon {...props} icon="chevron-right"/>}
            onPress={on_press_friend_requests}
          />
        </List.Section>
      </View>
    );
  }
  return null;
};

const AlertsScreen = function({navigation}) {
  const { colors } = useTheme();
  const { cache_get_fetcher, cache_get_fetcher_snapshot  } = useGlobalCache();
  
  const fetcher = cache_get_fetcher("AlertsScreen");
  const snap_fetcher = cache_get_fetcher_snapshot("AlertsScreen");
  
  const ref_list = useRef();
  const toast = useToast(); 
  
  const fetch = async function() {
    if (fetcher.default.is_refreshing || fetcher.default.is_loading_more) {
      return;
    }
    
    const query_args = [collection($.db, "users/" + $.session.uid + "/alerts"), orderBy("updated_at", "desc"), limit(16)];
    let alert_groups = [];
    
    if (fetcher.default.cursor) {
      fetcher.default.is_loading_more = true;
      fetcher.default.is_refreshing = false;
    } else {
      fetcher.default.is_refreshing = true;
      fetcher.default.is_loading_more = false;
    }
    
    try {
      let data;
      if (fetcher.default.cursor) {
        query_args.push(startAfter(fetcher.default.cursor));
      }
      const q = query(...query_args);
      const snap_docs = await getDocs(q);
      const size = _.size(snap_docs.docs);
      
      if (size === 16) {
        fetcher.default.cursor = _.last(snap_docs.docs);
      } else {
        fetcher.default.cursor = null;
      }
      if (size > 0) {
        _.each(snap_docs.docs, function(doc) {
          const alerts_group = doc.data();
          _.each(alerts_group.activities, function(activity) {
            console.log(activity);
          });
        }); 
        data = [];
      } else if (fetcher.default.is_refreshing) {
        data = [];
      }
      if (fetcher.default.is_refreshing) {
        fetcher.default.data = data;
      } else {
        fetcher.default.data = [...fetcher.default.data, ...data];
      }
    } catch (e) {
      $.logger.error(e);
      fetcher.default.is_loading_more ? fetcher.default.is_load_more_error = true : fetcher.default.is_refresh_error = true;
      $.display_error(toast, new Error("Something went wrong!"));
    } finally {
      fetcher.default.is_loading_more ? fetcher.default.is_loading_more = false : fetcher.default.is_refreshing = false; 
    }
    
   };
   
   const refresh = function() {
    fetcher.default.cursor = null;
    fetch();
  };
  
  const fetch_more = function() {
    if (!fetcher.default.cursor) {
      return;
    }
    fetch();
  };
  
  const on_press_retry = function() {
    fetcher.default.is_refresh_error = false;
    fetcher.default.is_load_more_error = false;
    fetch();
  };
   
  const render_alert = function(item) {
    return null;
  };
   
   _.size(snap_fetcher.default.data);
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={"top", "left", "right"}>
      <Appbar.Header>
        <Appbar.Content title={"Alerts"} />
      </Appbar.Header>
      <FlatList
        data={null}
        ListHeaderComponent=<AlertsListHeader navigation={navigation}/>
        ref={ref_list}
        keyboardShouldPersistTaps={"always"}
        data={snap_fetcher.default.data}
        renderItem={render_alert}
        keyExtractor = { item => item.id }
        ListFooterComponent = <ListFooter is_error={snap_fetcher.default.is_load_more_error} is_loading_more={snap_fetcher.default.is_loading_more} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty text={"No alerts found!"} is_refreshing={snap_fetcher.default.is_refreshing}/>
        refreshControl = {
          <RefreshControl
            refreshing={snap_fetcher.default.is_refreshing}
            onRefresh={refresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
        onEndReached={fetch_more}
        horizontal={false}
        onEndReachedThreshold={0.75}
      />
    </SafeAreaView> 
  );
};


export default AlertsScreen;