"use strict";

import $ from "../setup.js";
import _ from "underscore";
import { Fragment } from "react";
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Badge, useTheme } from 'react-native-paper';
import { Camera } from 'expo-camera';
import { Image, Text } from "react-native";
import TouchableOpacity  from "../components/TouchableOpacity";
import NameScreen from "./auth/NameScreen";
import UserPostListScreen from "./user/UserPostListScreen";
import AlertsScreen from "./alerts/AlertsScreen";
import UserScreen from "./user/UserScreen";
import UserListScreen from "./user/UserListScreen";
import SettingsScreen from "./settings/SettingsScreen";
import ProfileScreen from "./settings/ProfileScreen";
import NotificationsScreen from "./settings/NotificationsScreen";
import ContactsScreen from "./contacts/ContactsScreen";
import SearchScreen from "./search/SearchScreen";
import EditorStack from "./EditorStack";

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const createNavigator = true ? createStackNavigator : createNativeStackNavigator;

const HomeStackNavigator = createNavigator();
const HomeStack = function() {
  return (
    <HomeStackNavigator.Navigator screenOptions={{ gestureEnabled: true, gestureDirection: 'horizontal', gestureResponseDistance: $.const.width }}>
      <HomeStackNavigator.Screen name="UserPostListScreen" component={UserPostListScreen} options={{headerShown: false}}/>
      <HomeStackNavigator.Screen name="UserScreen" component={UserScreen} options={{headerShown: false}}/>
      <HomeStackNavigator.Screen name="UserListScreen" component={UserListScreen} options={{headerShown: false}}/>
      <HomeStackNavigator.Screen name="SettingsStack" component={SettingsStack} options={{headerShown: false}}/>
      <HomeStackNavigator.Screen name="ContactsStack" component={ContactsStack} options={{headerShown: false}}/>
    </HomeStackNavigator.Navigator>
  );
};

const DiscoverStackNavigator = createNavigator();
const DiscoverStack = function() {
  return (
    <DiscoverStackNavigator.Navigator screenOptions={{ gestureEnabled: true, gestureDirection: 'horizontal', gestureResponseDistance: $.const.width }}>
      <DiscoverStackNavigator.Screen name="UserPostListScreen" component={UserPostListScreen} options={{headerShown: false}} initialParams={{ screen: "DiscoverScreen" }}/>
      <DiscoverStackNavigator.Screen name="UserScreen" component={UserScreen} options={{headerShown: false}}/>
      <DiscoverStackNavigator.Screen name="UserListScreen" component={UserListScreen} options={{headerShown: false}}/>
      <DiscoverStackNavigator.Screen name="SettingsStack" component={SettingsStack} options={{headerShown: false}}/>
      <DiscoverStackNavigator.Screen name="ContactsStack" component={ContactsStack} options={{headerShown: false}}/>
      <DiscoverStackNavigator.Screen name="SearchScreen" component={SearchScreen} options={{headerShown: false, ...TransitionPresets.ScaleFromCenterAndroid}}/>
    </DiscoverStackNavigator.Navigator>
  );
};


const AlertsStackNavigator = createNavigator();
const AlertsStack = function() {
  return (
    <AlertsStackNavigator.Navigator screenOptions={{ gestureEnabled: true, gestureDirection: 'horizontal', gestureResponseDistance: $.const.width }}>
      <AlertsStackNavigator.Screen name="AlertsScreen" component={AlertsScreen} options={{headerShown: false}}/>
      <AlertsStackNavigator.Screen name="UserScreen" component={UserScreen} options={{headerShown: false}}/>
      <AlertsStackNavigator.Screen name="UserListScreen" component={UserListScreen} options={{headerShown: false}}/>
      <AlertsStackNavigator.Screen name="SettingsStack" component={SettingsStack} options={{headerShown: false}}/>
      <AlertsStackNavigator.Screen name="ContactsStack" component={ContactsStack} options={{headerShown: false}}/>
      <AlertsStackNavigator.Screen name="UserPostListScreen" component={UserPostListScreen} options={{headerShown: false}}/>
    </AlertsStackNavigator.Navigator>
  );
};


const SettingsStackNavigator =  createNavigator();
const SettingsStack = function() {
  return (
    <SettingsStackNavigator.Navigator screenOptions={{ gestureEnabled: true, gestureDirection: 'horizontal', gestureResponseDistance: $.const.width }}>
      <SettingsStackNavigator.Screen name="SettingsScreen" component={SettingsScreen} options={{headerShown: false}}/>
      <SettingsStackNavigator.Screen name="ProfileScreen" component={ProfileScreen} options={{headerShown: false}}/>
      <SettingsStackNavigator.Screen name="NotificationsScreen" component={NotificationsScreen} options={{headerShown: false}}/>
    </SettingsStackNavigator.Navigator>
  );
};

const ContactsStackNavigator =  createNavigator();
const ContactsStack = function() {
  return (
    <ContactsStackNavigator.Navigator screenOptions={{ gestureEnabled: true, gestureDirection: 'horizontal', gestureResponseDistance: $.const.width }}>
      <ContactsStackNavigator.Screen name="ContactsScreen" component={ContactsScreen} options={{headerShown: false}}/>
    </ContactsStackNavigator.Navigator>
  );
};


const UserStackNavigator = createNavigator();
const UserStack = function() {
  return (
    <UserStackNavigator.Navigator screenOptions={{ gestureEnabled: true, gestureDirection: 'horizontal', gestureResponseDistance: $.const.width }}>
      <UserStackNavigator.Screen name="UserScreen" component={UserScreen} options={{headerShown: false}}/>
      <UserStackNavigator.Screen name="UserListScreen" component={UserListScreen} options={{headerShown: false}}/>
      <UserStackNavigator.Screen name="SettingsStack" component={SettingsStack} options={{headerShown: false}}/>
      <UserStackNavigator.Screen name="ContactsStack" component={ContactsStack} options={{headerShown: false}}/>
      <UserStackNavigator.Screen name="UserPostListScreen" component={UserPostListScreen} options={{headerShown: false}}/>
    </UserStackNavigator.Navigator>
  );
};

const TabNavigator = createBottomTabNavigator();
const StackTabs = function({ navigation }) {
  const snap_current_user = $.get_snap_current_user();
  const { colors, dark } = useTheme();
  const [permissionCamera, requestPermissionCamera] = Camera.useCameraPermissions();
  
  const on_press_new_post = function() {
    if (!permissionCamera) {
      requestPermissionCamera();
      return;
    } else if (!permissionCamera.granted) {
      if (permissionCamera.canAskAgain) {
        requestPermissionCamera();
      } else {
        $.show_camera_permissions_dialog();
      }
      return;
    }
    $.reset_editor(); 
    navigation.push("EditorStack");
  };
  
  return (
    <TabNavigator.Navigator>
      <TabNavigator.Screen name="HomeStack" component={HomeStack} options={{headerShown: false, tabBarLabel: "Home", tabBarIcon: ({ focused, color }) => (
        <MaterialCommunityIcons name={focused ? "home" : "home-outline"} color={focused ? colors.primary : colors.outline} size={26} />
      )}}/>
      <TabNavigator.Screen name="DiscoverStack" component={DiscoverStack} options={{headerShown: false, tabBarLabel: "Discover", tabBarIcon: ({ focused, color }) => (
        <MaterialCommunityIcons name={focused ? "magnify" : "magnify"} color={focused ? colors.primary : colors.outline} size={26} />
      )}}/>
      <TabNavigator.Screen name="NewPostStack" component={HomeStack} options={{headerShown: false, tabBarLabel: "", tabBarIcon: ({ focused, color }) => (
        <TouchableOpacity style={{postion: "absolute", width: 60, height: 60, top: 12, alignItems: "center"}} onPress={on_press_new_post}>
          {(!snap_current_user || !snap_current_user.current_post) && (
            <Fragment>
              {dark && <Image source={require("../assets/dark-puzzled-500.png")} style={{width: 60, height: 60}}/>}
              {!dark && <Image source={require("../assets/light-puzzled-500.png")} style={{width: 60, height: 60}}/>}
            </Fragment>
          )}
          {(snap_current_user && snap_current_user.current_post) && (
            <Fragment>
              {dark && <Text style={{ fontFamily: "TwemojiMozilla", fontSize: 50}}>{snap_current_user.current_post.emoji_char}</Text>}
              {!dark && <Text style={{ fontFamily: "TwemojiMozilla", fontSize: 50}}>{snap_current_user.current_post.emoji_char}</Text>}
            </Fragment>
          )}
        </TouchableOpacity>
      )}} 
      listeners={{
        tabPress: e => {
          e.preventDefault();
          on_press_new_post();
        },
      }}
      />
      <TabNavigator.Screen name="AlertsStack" component={AlertsStack} options={{headerShown: false, tabBarLabel: "Alerts", tabBarIcon: ({ focused, color }) => (
        <Fragment>
          <MaterialCommunityIcons name={focused ? "bell" : "bell-outline"} color={focused ? colors.primary : colors.outline} size={26} />
          {(_.isNumber(snap_current_user.unread_request_by_count) && snap_current_user.unread_request_by_count > 0) && <Badge style={{position: "absolute", right: 12, top: -8}}>{snap_current_user.unread_request_by_count}</Badge>}
        </Fragment>
      )}}/>
      <TabNavigator.Screen name="UserStack" component={UserStack} options={{headerShown: false, tabBarLabel: "Profile", tabBarIcon: ({ focused, color }) => (
        <MaterialCommunityIcons name={focused ? "account" : "account-outline"} color={focused ? colors.primary : colors.outline} size={26} />
      )}}
      />
    </TabNavigator.Navigator>
  );
};

const MainStackNavigator = createNavigator();
const MainStack = function() {
  const snap_current_user = $.get_snap_current_user();
  if (!snap_current_user) {
    return null;
  }

  return (
    <MainStackNavigator.Navigator screenOptions={{headerShown: false, ...TransitionPresets.ScaleFromCenterAndroid}}>
      {!snap_current_user.username && (
        <MainStackNavigator.Group>
          <MainStackNavigator.Screen name="NameScreen" component={NameScreen}/>
        </MainStackNavigator.Group>
      )}
      {snap_current_user.username && (
        <MainStackNavigator.Group>
          <MainStackNavigator.Screen name="StackTabs" component={StackTabs}/>
          <MainStackNavigator.Screen name="EditorStack" component={EditorStack} options={{gestureEnabled: false}}/>
        </MainStackNavigator.Group>
      )}
    </MainStackNavigator.Navigator>
  );
};

export default MainStack;
