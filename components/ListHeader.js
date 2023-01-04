"use strict";
import $ from "../setup";
import _ from "underscore";
import { Fragment } from "react";
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Button, Divider, HelperText, SegmentedButtons, Text, useTheme } from "react-native-paper";
import approx from "approximate-number";
import TouchableOpacity  from "../components/TouchableOpacity";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useCachedData from "../hooks/useCachedData";
import { useSnapshot } from "valtio";


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
  
  const on_segment_value_change = function(value) {
    emoji_screen_state.segment_value = value;
    set_emoji_screen_state(_.extend({}, emoji_screen_state));
  };
  
  const counts = useCachedData.cache_get("counts") || {};
  
  return (
    <Fragment>
      {is_error && (
        <View style={{marginTop: 40, alignItems: "center"}}>
          <Button mode="contained" onPress={local_on_press_retry}>Retry</Button>
          <HelperText type="error">Somthing went wrong!</HelperText>
        </View>
      )}
      {screen === "DiscoverScreen" && (
        <View>
          <View style={{flexDirection: "row", marginBottom: 4}} keyboardShouldPersistTaps="always">
            {snap_session.global_counts[$.const.emoji_groups.smileys.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.smileys} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.smileys}/>}
            {snap_session.global_counts[$.const.emoji_groups.people.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.people} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.people}/>}
            {snap_session.global_counts[$.const.emoji_groups.animals.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.animals} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.animals}/>}
            {snap_session.global_counts[$.const.emoji_groups.food.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.food} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.food}/>}
            {snap_session.global_counts[$.const.emoji_groups.travel.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.travel} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.travel}/>}
            {snap_session.global_counts[$.const.emoji_groups.activities.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.activities} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.activities}/>}
            {snap_session.global_counts[$.const.emoji_groups.objects.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.objects} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.objects}/>}
            {snap_session.global_counts[$.const.emoji_groups.symbols.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.symbols} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.symbols}/>}
            {snap_session.global_counts[$.const.emoji_groups.flags.name] > 0 && <EmojiGroupButton group={$.const.emoji_groups.flags} on_press={on_press_emoji_group} is_selected={explore_screen_state.selected_group === $.const.emoji_groups.flags}/>}
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