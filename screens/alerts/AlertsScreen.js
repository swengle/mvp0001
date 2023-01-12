"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, View } from 'react-native';
import { Appbar, Avatar, Badge, List, Surface, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, limit, query, startAfter, orderBy } from "firebase/firestore";
import useGlobalCache from "../../hooks/useGlobalCache";
import { useToast } from "react-native-toast-notifications";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import firestore from "../../firestore/firestore";
import TouchableOpacity  from "../../components/TouchableOpacity";
import LiveTimeAgo from "../../components/LiveTimeAgo";
import FastImage from 'react-native-fast-image';
import EmojiOverlay from "../../components/EmojiOverlay";

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

const SimpleUser = function({ id, navigation, mode}) {
  const { cache_get_snapshot  } = useGlobalCache();
  const snap_user = cache_get_snapshot(id);
  if (!snap_user) {
    return null;
  }
  
  const on_press_user = function() {
    navigation.push("PostListScreen", {screen: "UserScreen", id: id});
  };
  
  if (mode === "avatar") {
    return (
      <TouchableOpacity onPress={on_press_user}>
        <Avatar.Image size={48} source={{uri: snap_user.profile_image_url}} style={{marginRight: 10}}/>
      </TouchableOpacity> 
    );
  }
  
  return (
    <TouchableOpacity onPress={on_press_user}>
      <Text style={{fontWeight: "bold"}}>{snap_user.username}</Text>
    </TouchableOpacity>  
  );
};

const SimplePost = function({ id, navigation}) {
  const [is_image_loaded, set_is_image_loaded] = useState();
  const { cache_get_snapshot  } = useGlobalCache();
  const snap_post = cache_get_snapshot(id);
  if (!snap_post) {
    return null;
  }
  
  const on_press_post = function() {
    navigation.push("PostScreen", {id: id});
  };
  
  const on_press_emoji = function(emoji) {
    navigation.push("PostListScreen", {screen: "EmojiScreen", emoji: emoji});
  };
  
  const on_image_load = function() {
    set_is_image_loaded(true);
  };
  
  return (
    <TouchableOpacity onPress={on_press_post} style={{marginTop: 4, marginLeft: 10}}>
      <FastImage source={{uri:snap_post.image_url}} style={{width: $.const.image_sizes["8"].width, height: $.const.image_sizes["8"].height}} onLoad={on_image_load}/>
      {is_image_loaded && _.isString(snap_post.emoji_char) && <EmojiOverlay  emoji_char={snap_post.emoji_char} scaling_factor={5}  on_press={on_press_emoji}/>}
    </TouchableOpacity>  
  );
};

const AlertGroup = function({ navigation, alert_group, index}) {
  const first_activity = _.first(alert_group.activities);
  const { colors } = useTheme();
  
  if (first_activity.verb === "like") {
    const size = _.size(alert_group.activities);
    const fragments = [];
    let idx = 0;
    _.each(_.first(alert_group.activities, 3), function(activity, index) {
      fragments.push(<SimpleUser key={++idx} id={activity.actor} navigation={navigation}/>);
      if (index === 0 && size == 2) {
        fragments.push(<Text key={++idx}> and </Text>);
      } else if (index === 0 && size > 2) {
        fragments.push(<Text key={++idx}>, </Text>);
      } else if (index === 1 && size === 3) {
        fragments.push(<Text key={++idx}> and </Text>);
      } else if (index === 1 && size > 3) {
        fragments.push(<Text key={++idx}>, </Text>);
      }
    });
    
    if (size > 3) {
      const other_count = size - 3;
      fragments.push(<Text key={++idx}> and {other_count} other{other_count === 1 ? "" : "s"}</Text>);
    }
    
    fragments.push(<Text key={++idx}> liked your post</Text>);
    return (
      <View key={first_activity.group} style={{padding: 10}}>
        <View style={{flexDirection: "row", alignItems: "center"}}>
          <SimpleUser id={first_activity.actor} navigation={navigation} mode="avatar"/>
          <View style={{flex: 1}}>
            <LiveTimeAgo style={{fontSize: 12, color: colors.outline}} date={first_activity.created_at.toDate()}/>
            <View style={{flexDirection: "row"}}>
              {fragments}
            </View>
          </View>
          <SimplePost id={first_activity.target} navigation={navigation}/>
        </View>
      </View>
    );
  } else if (first_activity.verb === "follow") {
    const size = _.size(alert_group.activities);
    const fragments = [];
    let idx = 0;
    _.each(_.first(alert_group.activities, 3), function(activity, index) {
      fragments.push(<SimpleUser key={++idx} id={activity.actor} navigation={navigation}/>);
      if (index === 0 && size == 2) {
        fragments.push(<Text key={++idx}> and </Text>);
      } else if (index === 0 && size > 2) {
        fragments.push(<Text key={++idx}>, </Text>);
      } else if (index === 1 && size === 3) {
        fragments.push(<Text key={++idx}> and </Text>);
      } else if (index === 1 && size > 3) {
        fragments.push(<Text key={++idx}>, </Text>);
      }
    });
    
    if (size > 3) {
      const other_count = size - 3;
      fragments.push(<Text key={++idx}> and {other_count} other{other_count === 1 ? "" : "s"}</Text>);
    }
    
    fragments.push(<Text key={++idx}> started following you.</Text>);
    
    return (
      <View key={first_activity.group} style={{padding: 10}}>
        <View style={{flexDirection: "row", alignItems: "center"}}>
          <SimpleUser id={first_activity.actor} navigation={navigation} mode="avatar"/>
          <View style={{flex: 1}}>
            <LiveTimeAgo style={{fontSize: 12, color: colors.outline}} date={first_activity.created_at.toDate()}/>
            <View style={{flexDirection: "row"}}>
              {fragments}
            </View>
          </View>
        </View>
      </View>
    );
  } else if (first_activity.verb === "comment") {
    const size = _.size(alert_group.unique_user_ids);
    const fragments = [];
    let idx = 0;
    _.each(_.first(alert_group.unique_user_ids, 3), function(user_id, index) {
      fragments.push(<SimpleUser key={++idx} key={user_id} id={user_id} navigation={navigation}/>);
      if (index === 0 && size == 2) {
        fragments.push(<Text key={++idx}> and </Text>);
      } else if (index === 0 && size > 2) {
        fragments.push(<Text key={++idx}>, </Text>);
      } else if (index === 1 && size === 3) {
        fragments.push(<Text key={++idx}> and </Text>);
      } else if (index === 1 && size > 3) {
        fragments.push(<Text key={++idx}>, </Text>);
      }
    });
    
    if (size > 3) {
      const other_count = size - 3;
      fragments.push(<Text key={++idx}> and {other_count} other{other_count === 1 ? "" : "s"}</Text>);
    }
    
    fragments.push(<Text key={++idx}> commented on your post.</Text>);
    
    const snap_comment = useGlobalCache.cache_get_snapshot(first_activity.id);
    return (
      <View key={first_activity.group} style={{padding: 10}}>
        <View style={{flexDirection: "row", alignItems: "center"}}>
          <SimpleUser id={first_activity.actor} navigation={navigation} mode="avatar"/>
          <View style={{flex: 1}}>
            <LiveTimeAgo style={{fontSize: 12, color: colors.outline}} date={first_activity.created_at.toDate()}/>
            <View style={{flexDirection: "row"}}>
              {fragments}
            </View>
            <Surface elevation={5} style={{padding: 4}}>
              <Text style={{fontSize: 13}}>
                { snap_comment.text }
              </Text>
            </Surface>
          </View>
          <SimplePost id={first_activity.target} navigation={navigation}/>
        </View>
      </View>
    );
  } else if (first_activity.verb === "reply") {
    const size = _.size(alert_group.unique_user_ids);
    const fragments = [];
    let idx = 0;
    _.each(_.first(alert_group.unique_user_ids, 3), function(user_id, index) {
      fragments.push(<SimpleUser key={++idx} key={user_id} id={user_id} navigation={navigation}/>);
      if (index === 0 && size == 2) {
        fragments.push(<Text key={++idx}> and </Text>);
      } else if (index === 0 && size > 2) {
        fragments.push(<Text key={++idx}>, </Text>);
      } else if (index === 1 && size === 3) {
        fragments.push(<Text key={++idx}> and </Text>);
      } else if (index === 1 && size > 3) {
        fragments.push(<Text key={++idx}>, </Text>);
      }
    });
    
    if (size > 3) {
      const other_count = size - 3;
      fragments.push(<Text key={++idx}> and {other_count} other{other_count === 1 ? "" : "s"}</Text>);
    }

    fragments.push(<Text key={++idx}> replied to your comment.</Text>);
    const snap_comment = useGlobalCache.cache_get_snapshot(first_activity.target);
    const snap_reply =  useGlobalCache.cache_get_snapshot(first_activity.id);
    return (
      <View key={first_activity.group} style={{padding: 10}}>
        <View style={{flexDirection: "row", alignItems: "center"}}>
          <SimpleUser id={first_activity.actor} navigation={navigation} mode="avatar"/>
          <View style={{flex: 1}}>
            <LiveTimeAgo style={{fontSize: 12, color: colors.outline}} date={first_activity.created_at.toDate()}/>
            <View style={{flexDirection: "row"}}>
              {fragments}
            </View>
            <Surface style={{padding: 4, marginTop: 2}}>
              <Text style={{fontSize: 12, color: colors.outline}}>
                { snap_comment.text }
              </Text>
            </Surface>
            <Surface elevation={5} style={{padding: 4, marginTop: 2}}>
              <Text style={{fontSize: 13}}>
                { snap_reply.text }
              </Text>
            </Surface>
          </View>
        </View>
      </View>
    );
  } else if (first_activity.verb === "accept") {
    const size = _.size(alert_group.activities);
    const fragments = [];
    let idx = 0;
    _.each(_.first(alert_group.activities, 3), function(activity, index) {
      fragments.push(<SimpleUser key={++idx} id={activity.actor} navigation={navigation}/>);
      if (index === 0 && size == 2) {
        fragments.push(<Text key={++idx}> and </Text>);
      } else if (index === 0 && size > 2) {
        fragments.push(<Text key={++idx}>, </Text>);
      } else if (index === 1 && size === 3) {
        fragments.push(<Text key={++idx}> and </Text>);
      } else if (index === 1 && size > 3) {
        fragments.push(<Text key={++idx}>, </Text>);
      }
    });
    
    if (size > 3) {
      const other_count = size - 3;
      fragments.push(<Text key={++idx}> and {other_count} other{other_count === 1 ? "" : "s"}</Text>);
    }
    
    fragments.push(<Text key={++idx}> accepted your friend request{size === 1 ? "" : "s"}.</Text>);

    return (
      <View key={first_activity.group} style={{padding: 10}}>
        <View style={{flexDirection: "row", alignItems: "center"}}>
          <SimpleUser id={first_activity.id} navigation={navigation} mode="avatar"/>
          <View style={{flex: 1}}>
            <LiveTimeAgo style={{fontSize: 12, color: colors.outline}} date={first_activity.created_at.toDate()}/>
            <View style={{flexDirection: "row"}}>
              {fragments}
            </View>
          </View>
        </View>
      </View>
    );
  }
  
  return null;
};

const AlertsScreen = function({navigation}) {
  const { colors } = useTheme();
  const { cache_set_users, cache_set_posts, cache_set_comments, cache_get_fetcher, cache_get_fetcher_snapshot  } = useGlobalCache();
  
  const fetcher = cache_get_fetcher("AlertsScreen");
  const snap_fetcher = cache_get_fetcher_snapshot("AlertsScreen");
  
  const ref_list = useRef();
  const toast = useToast(); 
  
  useEffect(() => {
    refresh();
  }, []);
  
  const fetch = async function() {
    if (fetcher.default.is_refreshing || fetcher.default.is_loading_more) {
      return;
    }
    
    const query_args = [collection($.db, "users/" + $.session.uid + "/alerts"), orderBy("updated_at", "desc"), limit(16)];
    
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
        data = [];
        const user_ids = {};
        const post_ids = {};
        const comment_ids = {};
        _.each(snap_docs.docs, function(doc) {
          const alert_group = doc.data();
          alert_group.activities.reverse();
          const unique_user_id_map = {};
          _.each(alert_group.activities, function(activity, index) {
            if (activity.verb === "comment" || activity.verb === "reply" ) {
              if (!unique_user_id_map[activity.actor]) {
                unique_user_id_map[activity.actor] = true;
                if (!alert_group.unique_user_ids) {
                  alert_group.unique_user_ids = [];
                }
                alert_group.unique_user_ids.push(activity.actor);
              }
            }
            alert_group.group = activity.group;
            if (activity.verb === "like") {
              _.size(user_ids) < 3 ? user_ids[activity.actor] = true : undefined;
              _.size(post_ids) < 3 ? post_ids[activity.target] = true : undefined;
            } else if (activity.verb === "follow") {
              _.size(user_ids) < 3 ? user_ids[activity.actor] = true : undefined;
            } else if (activity.verb === "comment") {
              _.size(post_ids) < 3 ? post_ids[activity.target] = true : undefined;
              _.size(comment_ids) < 3 ? comment_ids[activity.id] = true : undefined;
            } else if (activity.verb === "reply") {
              _.size(comment_ids) < 3 ? comment_ids[activity.target] = true : undefined;
              _.size(comment_ids) < 3 ? comment_ids[activity.id] = true : undefined;
            } else if (activity.verb === "accept") {
              _.size(user_ids) < 3 ? user_ids[activity.id] = true : undefined;
            }
          });
          
          data.push(alert_group);
        }); 
        
        let users, posts, comments;
        await Promise.all([
          users = _.size(user_ids) ? await firestore.fetch_users(_.keys(user_ids)) : undefined,
          posts = _.size(post_ids) ? await firestore.fetch_posts(_.keys(post_ids)) : undefined,
          comments = _.size(comment_ids) ? await firestore.fetch_comments(_.keys(comment_ids)) : undefined
        ]);
        
        _.size(users) && cache_set_users(users);
        _.size(posts) && cache_set_posts(posts);
        _.size(comments) && cache_set_comments(comments);
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
   
  const render_alert_group = function(row) {
    return <AlertGroup navigation={navigation} alert_group={row.item} index={row.index}/>;
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
        renderItem={render_alert_group}
        keyExtractor = { item => item.group }
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