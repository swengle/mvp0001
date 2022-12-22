"use strict";
import $ from "../setup";
import _ from "underscore";
import { Fragment, useCallback, useRef } from "react";
import { FlatList, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Divider, HelperText, Searchbar, SegmentedButtons, Text, useTheme } from "react-native-paper";
import approx from "approximate-number";
import TouchableOpacity  from "../components/TouchableOpacity";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useCachedData from "../hooks/useCachedData";
import { useFocusEffect } from '@react-navigation/native';
import { useSnapshot } from "valtio";
import useSearch from "../hooks/useSearch";
import EmojiSearchResult from "../components/EmojiSearchResult";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboard } from "@react-native-community/hooks";

const ExploreSearchResult = function({navigation, row}) {
  const { colors } = useTheme();
  
  if (row.item.username) {
    const user = row.item;
    
    const on_press_user = function() {
      navigation.push("UserScreen", {id: user.id});
    };
    
    return (
      <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
        <TouchableOpacity onPress={on_press_user} style={{flex: 7, flexDirection: "row", alignItems: "center"}}>
          <Avatar.Image size={40} source={{uri: user.profile_image_url}} style={{marginRight: 10}}/>
          <View>
            <Text variant="titleMedium">{user.username}</Text>
            {user.name && <Text variant="bodySmall">{user.name}</Text>}
            {row && row.contact_name && <Text variant="labelMedium" style={{color: colors.outline}}><MaterialCommunityIcons name="account-box-outline" size={14} />{row.contact_name}</Text>}
          </View>
        </TouchableOpacity>
      </View>
    );
  } else if (row.item.char) {
    return <EmojiSearchResult emoji={row.item} navigation={navigation}/>;
  }
};

const EmojiGroupButton = function({group, on_press, is_disabled, is_selected}) {
  const { colors } = useTheme();
  
  const local_on_press = function() {
    on_press(group);
  };
  
  const count = $.session.global_counts[group.name];
  if (!count) {
    return null;
  }
  
  return (
    <TouchableOpacity onPress={local_on_press} disabled={is_disabled} style={{flex: 1, alignItems: "center"}}> 
      <MaterialCommunityIcons name={group.icon} color={is_selected ? colors.primary : colors.outline} size={40}/>
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

const ListHeader = function({ is_error, on_press_retry, screen, is_refreshing, emoji, emoji_screen_state, set_emoji_screen_state, explore_screen_state, set_explore_screen_state, navigation}) {
  const snap_session = useSnapshot($.session);
  const ref_explore_searchbar = useRef();
  const { search_data, search_users, search_emojis, search_clear } = useSearch();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboard = useKeyboard();

  const update_emojis = function() {
    if (explore_screen_state.selected_group) {
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
  
  const update_global_counts = async function() {
    $.session.global_counts = (await $.cf.get_global_counts()).data;
    console.log($.session.global_counts);
    update_emojis();
  };
  
  useFocusEffect(useCallback(function() {
    update_global_counts();
  }, [screen]));

  
  const local_on_press_retry = function() {
    on_press_retry();
  };
  
  const on_press_emoji_group = function(group) {
    if (group === explore_screen_state.selected_group) {
      set_explore_screen_state({});
      return; 
    }
    explore_screen_state.selected_group = group;
    update_emojis();
  };
  
  
  const on_press_emoji = function(emoji) {
    if (emoji === explore_screen_state.selected_emoji) {
      delete explore_screen_state.selected_emoji;
      set_explore_screen_state(_.extend({}, explore_screen_state));
      return; 
    }
    explore_screen_state.selected_emoji = emoji;
    update_emojis();
  };
  
  const render_emoji = function(row) {
    return <Emoji emoji={row.item} on_press={on_press_emoji} is_not_selected={explore_screen_state.selected_emoji && explore_screen_state.selected_emoji !== row.item}/>;
  };
  
  const on_segment_value_change = function(value) {
    emoji_screen_state.segment_value = value;
    set_emoji_screen_state(_.extend({}, emoji_screen_state));
  };
  
  const counts = useCachedData.cache_get("counts") || {};
  
  const local_on_searchbar_focus = function() {
    explore_screen_state.is_searchbar_focused = true;
    explore_screen_state.is_search_active = true;
    set_explore_screen_state(_.extend({}, explore_screen_state));
  };
  
  const local_on_searchbar_blur = function() {
    explore_screen_state.is_searchbar_focused = false;
    set_explore_screen_state(_.extend({}, explore_screen_state));
  };
  
  const local_on_searchbar_change_text = function(text) {
    explore_screen_state.text = text;
    set_explore_screen_state(_.extend({}, explore_screen_state));
    const search_text = text.trim();
    do_search(search_text);
  };
  
  const do_search = _.debounce(function(search_text) {
    if (explore_screen_state.segment_value === "users") {
      search_users(search_text);
    } else if (explore_screen_state.segment_value === "emojis") {
      search_emojis(search_text);
    }
  }, 150);
  
  
  const on_press_cancel_searching = function() {
    search_clear();
    explore_screen_state.is_search_active = false;
    explore_screen_state.text = "";
    set_explore_screen_state(_.extend({}, explore_screen_state));
    ref_explore_searchbar.current.blur();
  };
  
  const render_search_item = function(row) {
    return <ExploreSearchResult row={row} navigation={navigation}/>;
  };
  
  const on_explore_segment_value_change = function(value) {
    explore_screen_state.segment_value = value;
    set_explore_screen_state(_.extend({}, explore_screen_state));
    const search_text = (explore_screen_state.text || "").trim();
    if (explore_screen_state.segment_value === "users") {
      search_users(search_text);
    } else if (explore_screen_state.segment_value === "emojis") {
      search_emojis(search_text);
    }
  };
  
  const list_height = height - insets.top - 64 - (keyboard.keyboardShown ? keyboard.keyboardHeight : 0); // window height minus safearea inset and AppBar height
  
  return (
    <Fragment>
      {is_error && (
        <View style={{marginTop: 40, alignItems: "center"}}>
          <Button mode="contained" onPress={local_on_press_retry}>Retry</Button>
          <HelperText type="error">Somthing went wrong!</HelperText>
        </View>
      )}
      {screen === "DiscoveryScreen" && (
        <View style={{height: explore_screen_state.is_search_active ? list_height: undefined}}>
          <View style={{flex: 1}}>
            <View style={{flexDirection: "row", alignItems: "center"}}>
              <View style={{flex:1}}><Searchbar ref={ref_explore_searchbar} style={{marginBottom: 4}} placeholder="Search" onFocus={local_on_searchbar_focus} onBlur={local_on_searchbar_blur} onChangeText={local_on_searchbar_change_text} value={explore_screen_state.text} autoCapitalize={false} autoCorrect={false} autoComplete="none"/></View>
              {explore_screen_state.is_search_active && (<Button style={{marginHorizontal: 4}} onPress={on_press_cancel_searching}>cancel</Button>)}
            </View>
            {explore_screen_state.is_search_active && (
              <View style={{flex:1}}>
                <SegmentedButtons
                  style={{marginVertical: 4, alignSelf: "center"}}
                  value={explore_screen_state.segment_value}
                  onValueChange={on_explore_segment_value_change}
                  buttons={[
                    {
                      icon: "account",
                      value: "users",
                      label: "Users",
                    },
                    {
                      icon: "emoticon-neutral-outline",
                      value: "emojis",
                      label: "Emojis",
                    }
                  ]}
                />
                <Divider style={{marginVertical: 4}}/>
                <View style={{flex: 1}}>
                  <FlashList
                    keyboardShouldPersistTaps="always"
                    data={search_data.data}
                    renderItem={render_search_item}
                    keyExtractor = { item => item.id || item.char }
                    ListEmptyComponent = {_.isArray(search_data.data) ? <View style={{marginTop: 40, alignItems: "center"}}><Text>Nothing found!</Text></View> : undefined}
                    estimatedItemSize={explore_screen_state.segment_value === "users" ? 100 : 60}
                  />
                </View>
              </View>
            )}
          </View>
          {!explore_screen_state.is_search_active && (
            <Fragment>
              <View style={{flexDirection: "row", marginBottom: 4}} keyboardShouldPersistTaps="always">
                {snap_session.global_counts[$.const.emoji_groups.smileys.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.smileys} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.smileys}/>}
                {snap_session.global_counts[$.const.emoji_groups.people.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.people} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.people}/>}
                {snap_session.global_counts[$.const.emoji_groups.animals.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.animals} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.animals}/>}
                {snap_session.global_counts[$.const.emoji_groups.food.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.food} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.food}/>}
                {snap_session.global_counts[$.const.emoji_groups.travel.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.travel} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.travel}/>}
                {snap_session.global_counts[$.const.emoji_groups.activities.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.activities} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.activities}/>}
                {snap_session.global_counts[$.const.emoji_groups.objects.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.objects} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.objects}/>}
                {snap_session.global_counts[$.const.emoji_groups.symbols.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.symbols} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.symbols}/>}
                {snap_session.global_counts[$.const.emoji_groups.smileys.flags] > 0 && <EmojiGroupButton group={$.const.emoji_groups.flags} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.flags}/>}
              </View>
              <Divider style={{marginBottom: 4}}/>
              {explore_screen_state.selected_group && (
                <Fragment>
                  <View style={{marginBottom: 4, alignItems: "center"}}>
                    <FlatList horizontal={true} alwaysBounceHorizontal={false} data={explore_screen_state.emojis_with_counts} renderItem={render_emoji} keyExtractor={(item) => item.char} estimatedItemSize={68} showsHorizontalScrollIndicator={false}/>
                  </View>
                  <Divider style={{marginTop: 4}}/>
                </Fragment>
              )}
            </Fragment> 
          )}
        </View>
      )}
      {screen === "EmojiScreen" && (
        <View style={{flexDirection: "row", paddingBottom: 10, alignItems: "center"}}>
          <View style={{flex: 1}}/>
          <SegmentedButtons
            value={emoji_screen_state.segment_value}
            onValueChange={on_segment_value_change}
            buttons={[
              {
                icon: "account-multiple",
                value: "everyone",
                label: "Everyone (" + (snap_session.global_counts[emoji.char] || 0) + ")",
              },
              {
                icon: "account",
                value: "you",
                label: "You (" + (counts[emoji.char] || 0) + ")",
              }
            ]}
          />
          <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
            { is_refreshing && <ActivityIndicator/> }
          </View>
        </View>
      )}
    </Fragment>
  );
};


export default ListHeader;