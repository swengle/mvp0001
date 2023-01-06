/* global fetch */
"use strict";
import $ from "../../setup.js";
import _ from "underscore";
import { Fragment, useEffect, useState } from "react";
import { AppState, FlatList, Platform, KeyboardAvoidingView, Image, Keyboard, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, Chip, Dialog, Divider, HelperText, IconButton, List, Paragraph, TextInput } from "react-native-paper";
import { useSnapshot } from "valtio";
import { subscribeKey } from 'valtio/utils';
import { useToast } from "react-native-toast-notifications";
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from "../../firestore/firestore";
import EmojiOverlay from "../../components/EmojiOverlay";
import useCachedData from "../../hooks/useCachedData";
import * as Location from 'expo-location';

const ChipLocation = function({location, on_press}) {
  
  const on_press_inner = function() {
    on_press(location);
  };
  
  return <Chip onPress={on_press_inner} style={{marginLeft: 5, marginRight: 5}}>{location.address_line1}</Chip>;
};

const DetailsScreen = function({navigation, route}) {
  const toast = useToast();
  const [is_dialog_enabled_location, set_is_dialog_enabled_location] = useState();
  const [caption_value, set_caption_value] = useState($.editor.caption_value);
  const [location_permission_status, set_location_permission_status] = useState(null);

  const snap_editor = useSnapshot($.editor);
  const snap_uploader = useSnapshot($.uploader.state);
  
  const snap_session = useSnapshot($.session);
  
  const { width } = useWindowDimensions();
  
  const check_location_permissions = async function() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    set_location_permission_status(status);
    if (status !== 'granted' || $.session.coarse_location_data) {
      return;
    }

    $.session.location = await Location.getCurrentPositionAsync({});
    const cities_url = "https://api.geoapify.com/v1/geocode/reverse?format=json&type=postcode&limit=16&lat=" + $.session.location.coords.latitude + "&lon=" + $.session.location.coords.longitude + "&apiKey=" + $.config.geoapify.api_key;
    try {
      const response = await fetch(cities_url);
      const json = await response.json();
      $.session.coarse_location_data = json.results;
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeKey($.uploader.state, "response", (response) => {
      if ($.uploader.state.is_saving) {
        save(response);
      }
    });
    
    
    const unsubscribe_app_state = AppState.addEventListener("change", function(next_app_state) {
      check_location_permissions();
    });

    check_location_permissions();

    return function() {
      delete $.uploader.state.is_saving;
      delete $.uploader.state.is_saving_failed;
      delete $.uploader.state.is_retry;
      unsubscribe();
      unsubscribe_app_state.remove();
    };
  }, []);
  
  const on_press_send = async function() {
    if ($.uploader.state.hasErrored) {
      $.uploader.state.is_saving_failed = true;
      return;
    }
    $.uploader.state.is_saving = true;
    if ($.uploader.state.response) {
      await save($.uploader.state.response);
    }
  };
  
  const save = async function(response) {
    $.uploader.state.is_saving_failed = false;
    try {
      const params = {image: response, emoji_char: snap_editor.emoji.char, emoji_group: snap_editor.emoji.group};
      
      if (caption_value != "") {
        params.caption = caption_value;
      }
      
      if ($.editor.location) {
        if ($.editor.location.properties) {
          // {"geometry": {"coordinates": [-71.13836, 42.451532], "type": "Point"}, "properties": {"accuracy": "point", "addendum": {"osm": [Object]}, "continent": "North America", "continent_gid": "whosonfirst:continent:102191575", "country": "United States", "country_a": "USA", "country_code": "US", "country_gid": "whosonfirst:country:85633793", "county": "Middlesex County", "county_a": "MI", "county_gid": "whosonfirst:county:102084643", "distance": 0.692, "gid": "openstreetmap:venue:node/9849311242", "id": "node/9849311242", "label": "D'Agostino's Delicatessen, Winchester, MA, USA", "layer": "venue", "localadmin": "Winchester", "localadmin_gid": "whosonfirst:localadmin:404476467", "locality": "Winchester", "locality_gid": "whosonfirst:locality:85950665", "name": "D'Agostino's Delicatessen", "region": "Massachusetts", "region_a": "MA", "region_gid": "whosonfirst:region:85688645", "source": "openstreetmap", "source_id": "node/9849311242"}, "type": "Feature"}
          const label_tokens = $.editor.location.properties.label.split(",");
          const label = _.rest(label_tokens).join(",").trim();
          params.location = {id: $.editor.location.properties.id, name: $.editor.location.properties.name, label:  label, lat: $.editor.location.geometry.coordinates[0], lon: $.editor.location.geometry.coordinates[1]}; 
        } else {
          // {"address_line1": "Winchester, MA 01890", "address_line2": "United States of America", "city": "Winchester", "country": "United States", "country_code": "us", "county": "Middlesex County", "datasource": {"attribution": "© OpenStreetMap contributors", "license": "Open Database License", "sourcename": "openstreetmap", "url": "https://www.openstreetmap.org/copyright"}, "distance": 930.0264675734445, "formatted": "Winchester, MA 01890, United States of America", "lat": 42.456576225, "lon": -71.14113251, "place_id": "518eb6a65008c951c059c940f916713a4540f00101f901de7a1d0000000000", "postcode": "01890", "rank": {"popularity": 5.011459744215433}, "result_type": "postcode", "state": "Massachusetts", "state_code": "MA", "timezone": {"abbreviation_DST": "EDT", "abbreviation_STD": "EST", "name": "America/New_York", "offset_DST": "-04:00", "offset_DST_seconds": -14400, "offset_STD": "-05:00", "offset_STD_seconds": -18000}}
          params.location = {id: $.editor.location.place_id, name: $.editor.location.address_line1, lat: $.editor.location.lat, lon: $.editor.location.lon}; 
        }
      }
      
      const new_post = await firestore.create_post(params);
      useCachedData.cache_set(new_post);
      navigation.navigate("StackTabs");
    } catch (e) {
      $.logger.error(e);
      $.display_error(toast, new Error("Failed to save image."));
      $.uploader.state.is_saving_failed = true;
    } finally {
      $.uploader.state.is_saving = false;
    }
  };
  
  const on_press_retry = async function() {
    $.uploader.state.is_saving_failed = false;
    $.uploader.state.is_retry = true;
    if ($.uploader.state.hasErrored) {
      $.uploader.retry();
      return;
    } else {
      $.uploader.state.is_saving = true;
      await save($.uploader.state.response);
    }
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_change_text_caption = function(value) {
    set_caption_value(value);
    $.editor.caption_value = value;
  };
  
  const on_press_image = function() {
    Keyboard.dismiss();
  };
  
  const ratio = width/1080;
  const picture_height = snap_editor.pic ? Math.round(snap_editor.pic.height * ratio) : 0;
  
  const on_press_not_granted_location = function() {
    set_is_dialog_enabled_location(true);
  };
  
  const on_press_cancel_dialog = function() {
    set_is_dialog_enabled_location(false);
  };
  
  const on_press_open_settings = function() {
    set_is_dialog_enabled_location(false);
    $.openAppSettings();
  };
  
  const on_press_granted_location = function() {
    navigation.push("LocationEditScreen");
  };
  
  const on_press_chiplocation = function(location) {
    $.editor.location = location;
  };
  
  const render_location = function(row) {
    return <ChipLocation location={row.item} index={row.index} on_press={on_press_chiplocation}/>;
  };
  
  const on_press_delete_location = function() {
    delete $.editor.location;
  };
  
  let location_description; 
  if (snap_editor.location && snap_editor.location.properties) {
    const label_tokens = snap_editor.location.properties.label.split(",");
    location_description = _.rest(label_tokens).join(",").trim();
  }
  
  return (
      <SafeAreaView style ={{flex: 1}} edges={["top", "right", "left", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          {!snap_editor.pic && (
            <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
              <ActivityIndicator animating={true}/>
            </View>
          )}
          {(snap_editor.pic && snap_editor.pic.uri) && (
            <Fragment>
              <Appbar.Header>
                <Appbar.BackAction onPress={on_press_back} />
                <Appbar.Content title=""/>
                  {(!snap_uploader.is_saving_failed && (snap_uploader.is_saving || snap_uploader.is_retry) && !snap_uploader.hasErrored) && <ActivityIndicator animating={true}/>}
                  {(!snap_uploader.is_saving_failed && !snap_uploader.is_saving && !snap_uploader.is_retry) && <Button  mode="contained" onPress={on_press_send}>Send</Button>}
                  {(snap_uploader.is_saving_failed || ((snap_uploader.is_saving || snap_uploader.is_retry) && snap_uploader.hasErrored)) && (<View style={{flexDirection: "row", alignItems: "center"}}><HelperText type="error">Something went wrong.</HelperText><Button mode="contained" onPress={on_press_retry}>Retry</Button></View>)}
              </Appbar.Header>
              <ScrollView style={{flex: 1}} keyboardShouldPersistTaps='always'>
                <Pressable onPress={on_press_image}>
                  <Image source={{ uri: snap_editor.pic.uri }} style={{ width: width, height: picture_height }} />
                </Pressable>
                <EmojiOverlay on_press={on_press_back} emoji_char={snap_editor.emoji.char} scaling_factor={1}/>
                <TextInput
                  label="Caption"
                  onChangeText={on_change_text_caption}
                  maxLength={1024}
                  value={caption_value}
                  autoCorrect={true}
                  multiline={true} 
                  scrollEnabled={false}
                />
                
                {snap_editor.location && (
                  <List.Section>
                    <List.Item
                      title={snap_editor.location.properties ? snap_editor.location.properties.name : snap_editor.location.address_line1}
                      description={location_description}
                      left={props => <List.Icon {...props} icon="map-marker" />}
                      right={props => <IconButton icon="delete" onPress={on_press_delete_location}/>}
                    />
                    <Divider/>
                  </List.Section>
                )}
                
                {!snap_editor.location && (
                  <Fragment>
                    <List.Section>
                      <List.Item
                        title="Add location"
                        left={props => <List.Icon {...props} icon="map-marker" />}
                        right={props => <List.Icon {...props} icon="chevron-right"/>}
                        onPress={location_permission_status !== "granted"  ? on_press_not_granted_location : on_press_granted_location}
                      />
                    </List.Section>
                    {_.size(snap_session.coarse_location_data) > 0 && (
                      <FlatList style={{marginLeft: 10, marginRight: 10, marginTop: 4}} horizontal={true} alwaysBounceHorizontal={false} data={snap_session.coarse_location_data} renderItem={render_location} keyExtractor={(item) => item.place_id} showsHorizontalScrollIndicator={false}/>
                    )}
                  </Fragment>
                )}
              </ScrollView>
            </Fragment>
          )}
        </KeyboardAvoidingView>
        <Dialog visible={is_dialog_enabled_location} dismissable={false}>
            <Dialog.Content>
              <Paragraph>Please enable permission to use your location.</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={on_press_cancel_dialog}>Cancel</Button>
              <Button onPress={on_press_open_settings}>Open Settings</Button>
            </Dialog.Actions>
        </Dialog>
      </SafeAreaView>
  );
};


export default DetailsScreen;