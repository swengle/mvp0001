import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import CameraScreen from "./editor/CameraScreen";
import DetailsScreen from "./editor/DetailsScreen";
import SelectEmojiScreen from "./editor/SelectEmojiScreen";

const createNavigator = true ? createStackNavigator : createNativeStackNavigator;

const Stack = createNavigator();

const EditorStack = function() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false, ...TransitionPresets.ScaleFromCenterAndroid}}>
      <Stack.Screen name="CameraScreen" component={CameraScreen}/>
      <Stack.Screen name="DetailsScreen" component={DetailsScreen}/>
      <Stack.Screen name="SelectEmojiScreen" component={SelectEmojiScreen}/>
    </Stack.Navigator>
  );
};

export default EditorStack;
