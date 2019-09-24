export = index;
declare class index {
  static asEvent(p: any): any;
  static blankNode(value: any): any;
  static dataset(): any;
  static defaultGraph(): any;
  static graph(quads: any): any;
  static literal(value: any, languageOrDatatype: any): any;
  static namedNode(value: any): any;
  static prefixMap(prefixes: any): any;
  static quad(subject: any, predicate: any, object: any): any;
  static triple(subject: any, predicate: any, object: any): any;
  static variable(value: any): any;
  static waitFor(event: any): any;
}
declare namespace index {
  class Parsers {
    constructor(parsers: any);
    find(mediaType: any): any;
    list(): any;
  }
  class Serializers {
    constructor(serializers: any);
    find(mediaType: any): any;
    list(): any;
  }
  const defaultGraphInstance: {
    equals: Function;
    termType: string;
    value: string;
  };
  namespace defaults {
    class BlankNode {
      static nextId: number;
      equals(other: any): any;
      toCanonical(): any;
      toJSON(): any;
    }
    class Dataset {
      // Circular reference from index.defaults.Dataset
      static factory: any;
      constructor(quads: any);
      add(quad: any): any;
      addAll(quads: any): any;
      clone(): any;
      create(quads: any): any;
      difference(other: any): any;
      equals(other: any): any;
      every(predicate: any): any;
      filter(predicate: any): any;
      forEach(callback: any): void;
      includes(quad: any): any;
      intersection(other: any): any;
      map(callback: any): any;
      match(subject: any, predicate: any, object: any, graph: any): any;
      merge(other: any): any;
      remove(quad: any): any;
      removeMatches(subject: any, predicate: any, object: any, graph: any): any;
      some(callback: any): any;
      toArray(): any;
      toCanonical(): any;
      toJSON(): any;
      toStream(): any;
    }
    class Literal {
      equals(other: any): any;
      toCanonical(): any;
      toJSON(): any;
    }
    namespace Literal {
      const langStringDatatype: {
        equals: Function;
        termType: string;
        value: string;
      };
      const stringDatatype: {
        equals: Function;
        termType: string;
        value: string;
      };
    }
    class NamedNode {
      equals(other: any): any;
      toCanonical(): any;
      toJSON(): any;
    }
    class PrefixMap {
      constructor(factory: any, prefixes: any);
      factory: any;
      map: any;
      addAll(prefixes: any): any;
      clone(): any;
      resolve(curie: any): any;
      shrink(iri: any): any;
    }
    class Quad {
      equals(other: any): any;
      toCanonical(): any;
      toJSON(): any;
    }
    class Variable {
      equals(other: any): any;
      toCanonical(): any;
      toJSON(): any;
    }
    const defaultGraph: {
      equals: Function;
      termType: string;
      toCanonical: Function;
      toJSON: Function;
      value: string;
    };
  }
}
