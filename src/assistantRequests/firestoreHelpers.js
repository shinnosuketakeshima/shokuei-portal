// src/assistantRequests/firestoreHelpers.js
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { buildNewRequestFields } from './requestUtils.js';

const COLLECTION_NAME = 'assistant_requests';

export async function fetchAllAssistantRequests() {
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addAssistantRequest(formValues, existingRequests) {
  const fields = buildNewRequestFields(formValues, existingRequests);
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...fields,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { id: docRef.id, ...fields };
}

export async function updateAssistantRequest(id, fields) {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    ...fields,
    updatedAt: serverTimestamp()
  });
}

export async function deleteAssistantRequest(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}
