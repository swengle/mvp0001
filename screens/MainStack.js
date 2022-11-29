"use strict";

import $ from "../setup.js";
import { TransitionPresets } from '@react-navigation/stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
import { useTheme } from 'react-native-paper';
import { Camera } from 'expo-camera';
import { Image } from "react-native";
import NameScreen from "./auth/Name";
import HomeScreen from "./home/Home";
import AlertsScreen from "./alerts/AlertsScreen";
import UserScreen from "./user/UserScreen";
import EditorStack from "./EditorStack";

import { useSnapshot} from "valtio";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const Stack = createNativeStackNavigator();

const HomeStackNavigator = createNativeStackNavigator();
const HomeStack = function() {
  return (
    <HomeStackNavigator.Navigator>
      <HomeStackNavigator.Screen name="HomeScreen" component={HomeScreen} options={{headerShown: false}}/>
      <HomeStackNavigator.Screen name="UserScreen" component={UserScreen} options={{headerShown: false}}/>
    </HomeStackNavigator.Navigator>
  );
};

const AlertsStack = function() {
  return (
    <HomeStackNavigator.Navigator>
      <HomeStackNavigator.Screen name="AlertsScreen" component={AlertsScreen} options={{headerShown: false}}/>
      <HomeStackNavigator.Screen name="HomeScreen" component={HomeScreen} options={{headerShown: false}}/>
      <HomeStackNavigator.Screen name="UserScreen" component={UserScreen} options={{headerShown: false}}/>
    </HomeStackNavigator.Navigator>
  );
};

const UserStackNavigator = createNativeStackNavigator();
const UserStack = function() {
  return (
    <UserStackNavigator.Navigator>
      <UserStackNavigator.Screen name="UserScreen" component={UserScreen} options={{headerShown: false}}/>
    </UserStackNavigator.Navigator>
  );
};

const TabNavigator = createMaterialBottomTabNavigator();
const StackTabs = function({ navigation }) {
  const { colors } = useTheme();
  const [permissionCamera, requestPermissionCamera] = Camera.useCameraPermissions();
  
  return (
    <TabNavigator.Navigator shifting={true}>
      <TabNavigator.Screen name="HomeStack" component={HomeStack} options={{headerShown: false, tabBarLabel: "Home", tabBarIcon: ({ focused, color }) => (
        <MaterialCommunityIcons name={focused ? "home" : "home-outline"} color={focused ? colors.primary : colors.surfaceDisabled} size={26} />
      )}}/>
      <TabNavigator.Screen name="DiscoverStack" component={HomeStack} options={{headerShown: false, tabBarLabel: "Discover", tabBarIcon: ({ focused, color }) => (
        <MaterialCommunityIcons name={focused ? "magnify" : "magnify"} color={focused ? colors.primary : colors.surfaceDisabled} size={26} />
      )}}/>
      <TabNavigator.Screen name="NewPostStack" component={HomeStack} options={{headerShown: false, tabBarLabel: "", tabBarIcon: ({ focused, color }) => (
        <Image source={require("../assets/icons8-puzzled-100.png")} style={{width: 56, height: 56}}/>
      )}} 
      listeners={{
        tabPress: e => {
          e.preventDefault();
          if (!permissionCamera) {
            $.dialog.is_camera_permission_visible = true;
            return;
          } else if (!permissionCamera.granted) {
            if (permissionCamera.canAskAgain) {
              $.dialog.is_camera_permission_visible = true;
            } else {
              requestPermissionCamera();
            }
            return;
          }
          navigation.push("EditorStack");
        },
      }}
      />
      <TabNavigator.Screen name="AlertsStack" component={AlertsStack} options={{headerShown: false, tabBarLabel: "Alerts", tabBarIcon: ({ focused, color }) => (
        <MaterialCommunityIcons name={focused ? "bell" : "bell-outline"} color={focused ? colors.primary : colors.surfaceDisabled} size={26} />
      )}}/>
      <TabNavigator.Screen name="UserStack" component={UserStack} options={{headerShown: false, tabBarLabel: "Profile", tabBarIcon: ({ focused, color }) => (
        <MaterialCommunityIcons name={focused ? "account" : "account-outline"} color={focused ? colors.primary : colors.surfaceDisabled} size={26} />
      )}}/>
    </TabNavigator.Navigator>
  );
};

const MainStack = function() {
  const session = useSnapshot($.session);
  
  return (
    <Stack.Navigator screenOptions={{headerShown: false, ...TransitionPresets.ModalPresentationIOS}}>
      {!session.user.username && (
        <Stack.Group>
          <Stack.Screen name="NameScreen" component={NameScreen}/>
        </Stack.Group>
      )}
      {session.user.username && (
        <Stack.Group>
          <Stack.Screen name="StackTabs" component={StackTabs}/>
          <Stack.Screen name="EditorStack" component={EditorStack}/>
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};

export default MainStack;
