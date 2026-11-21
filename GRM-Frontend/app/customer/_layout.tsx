import React from 'react';
import { Slot } from 'expo-router';
import Guard from '../../components/Guard';
export default function L() { return <Guard roles={['Customer']}><Slot /></Guard>; }

