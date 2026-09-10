import { ref } from 'vue';
import { useGetPet } from './generated/pets';
import type { Pet } from './generated/models';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
export type InferredPetData = Assert<Equal<ReturnType<typeof useGetPet>['data']['value'], Pet | undefined>>;

// Compile-only checks; never mounted or imported by the page.
export function parameterTypes() {
  useGetPet(1);
  useGetPet(ref(1));
  useGetPet(() => 1);
  // @ts-expect-error OpenAPI requires a numeric ID.
  useGetPet('invalid');
}
