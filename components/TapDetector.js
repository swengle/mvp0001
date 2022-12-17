"use strict";
import _ from "underscore";
import { useRef } from "react";
import { State, TapGestureHandler } from "react-native-gesture-handler";


const TapDetector = ({children, on_single_tap, on_double_tap}) => {
  const doubleTapRef = useRef(null);

  const on_single_tap_innner = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      _.isFunction(on_single_tap) && on_single_tap();
    }
  };

  const on_double_tap_inner = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      _.isFunction(on_double_tap) && on_double_tap();
    }
  };

  return (
    <TapGestureHandler
      onHandlerStateChange={on_single_tap_innner}
      waitFor={doubleTapRef}>
      <TapGestureHandler
        ref={doubleTapRef}
        onHandlerStateChange={on_double_tap_inner}
        numberOfTaps={2}>
        {children}
      </TapGestureHandler>
    </TapGestureHandler>
  );
};

export default TapDetector;
