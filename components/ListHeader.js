"use strict";
import $ from "../setup";
import _ from "underscore";
import { Fragment, useState } from "react";
import { FlatList, Linking, Platform, View } from 'react-native';
import { Avatar, Button, Chip, Divider, HelperText, Text, useTheme } from "react-native-paper";
import approx from "approximate-number";
import TouchableOpacity  from "../components/TouchableOpacity";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSnapshot } from "valtio";
import { useToast } from "react-native-toast-notifications";
import firestore from "../firestore/firestore";
import useGlobalCache from "../hooks/useGlobalCache";
import MapView from 'react-native-maps';
import { Marker } from 'react-native-maps';

const EmojiGroupButton = function({group, on_press, selected_group}) {
  const { colors } = useTheme();
  
  const local_on_press = function() {
    on_press(group);
  };
  
  const count = $.session.global_counts[group.name];
  if (!count) {
    return null;
  }
  
  const is_selected = selected_group ===group;
  
  return (
    <TouchableOpacity onPress={local_on_press} style={{flex: 1, alignItems: "center"}}> 
      <MaterialCommunityIcons name={group.icon} color={colors.outline} size={40} style={{opacity: (!selected_group || is_selected) ? 1 : 0.35}}/>
      <Text style={{color: colors.secondary, fontSize: 12}}>{approx(count)}</Text>
    </TouchableOpacity>
  );
};

const Emoji = function({emoji, on_press, is_not_selected}) {
  const { colors } = useTheme();
  
  const count = $.session.global_counts[emoji.char] || 0;
  if (count < 1) {
    return null;
  }
  
  const local_on_press = function() {
    on_press(emoji);
  };

  return (
    <TouchableOpacity style={{width: 68}} onPress={local_on_press}>
      <Text style={{width: 68, fontFamily: "TwemojiMozilla", fontSize: 50, textAlign: "center", opacity: is_not_selected ? 0.4 : 1}}>{emoji.char}</Text>
      <Text style={{width: 68, color: colors.secondary, fontSize: 12, textAlign: "center"}}>{approx(count)}</Text>
    </TouchableOpacity>
  );
};

const ListHeader = function({ id, is_error, on_press_retry, screen, is_refreshing, emoji, explore_screen_state, set_explore_screen_state, navigation, coordinate}) {
  const { cache_get_snapshot  } = useGlobalCache();
  const snap_session = useSnapshot($.session);
  const [busy_button_text, set_busy_button_text] = useState();
  const toast = useToast();
  
  const snap_user = screen === "UserScreen" ? cache_get_snapshot(id) : undefined;
  
  const update_emojis = function() {
    if (!explore_screen_state.is_search_active && explore_screen_state.selected_group) {
      const emojis_with_counts = [];
      _.each($.emoji_data_by_group[explore_screen_state.selected_group.name], function(emoji) {
        if ($.session.global_counts[emoji.char] > 0) {
          emojis_with_counts.push(emoji);
        }
      });
      explore_screen_state.emojis_with_counts = emojis_with_counts;
      set_explore_screen_state(_.extend({}, explore_screen_state));
    }
  };
  
  const local_on_press_retry = function() {
    on_press_retry();
  };
  
  const on_press_emoji_group = function(group) {
    if (group === explore_screen_state.selected_group) {
      delete explore_screen_state.selected_group;
      delete explore_screen_state.selected_emoji;
    } else {
      explore_screen_state.selected_group = group;
      delete explore_screen_state.selected_emoji;
    }
    set_explore_screen_state(_.extend({}, explore_screen_state));
    update_emojis();
  };
  
  
  const on_press_emoji = function(emoji) {
    if (emoji === explore_screen_state.selected_emoji) {
      delete explore_screen_state.selected_emoji;
    } else {
      explore_screen_state.selected_emoji = emoji;
    }
    update_emojis();
    set_explore_screen_state(_.extend({}, explore_screen_state));
  };
  
  const render_emoji = function(row) {
    return <Emoji emoji={row.item} on_press={on_press_emoji} is_not_selected={explore_screen_state.selected_emoji && explore_screen_state.selected_emoji !== row.item}/>;
  };
  
  const on_press_followers = function() {
    navigation.push("UserListScreen", {id: id, screen: "FollowersScreen"});
  };
  
  const on_press_following = function() {
    navigation.push("UserListScreen", {id: id, screen: "FollowingScreen"});
  };

  const on_press_relationship = async function() {
    const user = useGlobalCache.cache_get(id);
    const current_status = user.outgoing_status;
    try {
      const action = $.get_relationship_action_from_status(user.outgoing_status);
      if (action === "follow") {
        set_busy_button_text(user.is_account_public ? "Following" : "Requested");
      } else if (action === "unfollow" || action === "unblock") {
        user.outgoing_status = "none";
        set_busy_button_text("Follow");
      } else if (action === "block") {
        set_busy_button_text("Unblock");
      }
      
      const result = await firestore.update_relationship({
        id : id,
        action: action
      });
      
      if (result.outgoing_status === "follow" && current_status !== "follow") {
        _.isNumber(user.follow_by_count) ? user.follow_by_count++ : user.follow_by_count = 1;
      } else if (result.outgoing_status !== "follow" && current_status === "follow") {
        _.isNumber(user.follow_by_count) ? user.follow_by_count-- : user.follow_by_count = 0;
      }
      
      user.outgoing_status = result.outgoing_status;
    } catch (e) {
      $.logger.error(e);
      set_busy_button_text(null);
      $.display_error(toast, new Error("Something went wrong!"));
    }
  };
  
  const open_in_maps = function() {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${coordinate.latitude},${coordinate.longitude}`;
    const label = "swen location";
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    Linking.openURL(url);
  };
  
  return (
    <Fragment>
      {is_error && (
        <View style={{marginTop: 40, alignItems: "center"}}>
          <Button mode="contained" onPress={local_on_press_retry}>Retry</Button>
          <HelperText type="error">Somthing went wrong!</HelperText>
        </View>
      )}
      {screen === "LocationScreen" && (
        <View>
          <MapView style={{height: 140}} initialRegion={{latitude: coordinate.latitude, longitude: coordinate.longitude, latitudeDelta: 0.0922, longitudeDelta: 0.0421}}>
            <Marker key={0} coordinate={{latitude: coordinate.latitude, longitude: coordinate.longitude}}/>
          </MapView>
          <Button mode="contained" onPress={open_in_maps} style={{position: "absolute", right: 4, bottom: 4}}>Open Map</Button>
        </View>
      )}
      {screen === "UserScreen" && (
        <Fragment>
          <View style={{margin: 10, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
            <Avatar.Image size={80} source={{uri: snap_user.profile_image_url}} />
      
            <View style={{flex: 1, flexDirection: "column"}}>
              <View style={{flex: 1}}/>
              {snap_user.name && (<Text variant="titleMedium" style={{alignSelf: "center", marginBottom: 4}}>{snap_user.name}</Text>)}
              <View style={{flexDirection: "row", justifyContent: "center", height: 40}}>
                <Chip style={{marginRight: 8, alignItems: "center"}} mode="outlined" onPress={on_press_followers}>{snap_user.follow_by_count || 0} {snap_user.follow_by_count === 1 ? "Follower" : "Followers"}</Chip>
                <Chip style={{alignItems: "center"}} mode="outlined" onPress={on_press_following}>{snap_user.follow_count || 0} Following</Chip>
              </View>
              {(id !== $.session.uid) && <Button mode="contained" style={{marginTop: 10, marginHorizontal: 10}} onPress={on_press_relationship}>{busy_button_text ? busy_button_text : $.get_relationship_button_text_from_status(snap_user.outgoing_status)}</Button>}
              <View style={{flex: 1}}/>
            </View>
          </View>
      
          {snap_user.bio && (
            <View style={{margin: 10, marginTop: 0}}>
              <Text>{snap_user.bio}</Text>
            </View>
          )}
          
          <Divider/>
        </Fragment>
      )}
      {screen === "DiscoverScreen" && (
        <View>
          <View style={{flexDirection: "row", marginBottom: 4}} keyboardShouldPersistTaps="always">
            {snap_session.global_counts[$.const.emoji_groups.smileys.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.smileys} on_press={on_press_emoji_group} selected_group={explore_screen_state.selected_group}/>}
            {snap_session.global_counts[$.const.emoji_groups.people.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.people} on_press={on_press_emoji_group} selected_group={explore_screen_state.selected_group}/>}
            {snap_session.global_counts[$.const.emoji_groups.animals.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.animals} on_press={on_press_emoji_group} selected_group={explore_screen_state.selected_group}/>}
            {snap_session.global_counts[$.const.emoji_groups.food.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.food} on_press={on_press_emoji_group} selected_group={explore_screen_state.selected_group}/>}
            {snap_session.global_counts[$.const.emoji_groups.travel.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.travel} on_press={on_press_emoji_group} selected_group={explore_screen_state.selected_group}/>}
            {snap_session.global_counts[$.const.emoji_groups.activities.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.activities} on_press={on_press_emoji_group} selected_group={explore_screen_state.selected_group}/>}
            {snap_session.global_counts[$.const.emoji_groups.objects.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.objects} on_press={on_press_emoji_group} selected_group={explore_screen_state.selected_group}/>}
            {snap_session.global_counts[$.const.emoji_groups.symbols.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.symbols} on_press={on_press_emoji_group} selected_group={explore_screen_state.selected_group}/>}
            {snap_session.global_counts[$.const.emoji_groups.flags.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.flags} on_press={on_press_emoji_group} selected_group={explore_screen_state.selected_group}/>}
          </View>
          <Divider/>
          {explore_screen_state.selected_group && (
            <Fragment>
              <View style={{marginBottom: 4, marginTop:4, alignItems: "center"}}>
                <FlatList horizontal={true} alwaysBounceHorizontal={false} data={explore_screen_state.emojis_with_counts} renderItem={render_emoji} keyExtractor={(item) => item.char} estimatedItemSize={68} showsHorizontalScrollIndicator={false}/>
              </View>
              <Divider style={{marginTop: 4}}/>
            </Fragment>
          )}
      </View>
      )}
    </Fragment>
  );
};


export default ListHeader;