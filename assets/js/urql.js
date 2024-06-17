/**
 * copy pasted from https://cdn.jsdelivr.net/npm/urql@4.1.0/+esm
 */
/**
 * Bundled by jsDelivr using Rollup v2.79.1 and Terser v5.19.2.
 * Original file: /npm/urql@4.1.0/dist/urql.es.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
import { createRequest as e } from "/npm/@urql/core@5.0.4/+esm";
export * from "/npm/@urql/core@5.0.4/+esm";
import * as r from "/npm/react@18.3.1/+esm";
import {
  toPromise as t,
  take as n,
  filter as u,
  onPush as a,
  subscribe as o,
  takeWhile as s,
  onEnd as i,
} from "/npm/wonka@6.3.4/+esm";
var c = {},
  f = r.createContext(c),
  l = f.Provider,
  v = f.Consumer;
f.displayName = "UrqlContext";
var d = () => {
    var e = r.useContext(f);
    return e;
  },
  p = {
    fetching: !1,
    stale: !1,
    error: void 0,
    data: void 0,
    extensions: void 0,
    operation: void 0,
  },
  x = (e, r) => e === r || !(!e || !r || e.key !== r.key),
  y = (e, r) => {
    var t = {
      ...e,
      ...r,
      data: void 0 !== r.data || r.error ? r.data : e.data,
      fetching: !!r.fetching,
      stale: !!r.stale,
    };
    return ((e, r) => {
      for (var t in e) if (!(t in r)) return !0;
      for (var n in r)
        if ("operation" === n ? !x(e[n], r[n]) : e[n] !== r[n]) return !0;
      return !1;
    })(e, t)
      ? t
      : e;
  },
  h = (e, r) => {
    for (var t = 0, n = r.length; t < n; t++) if (e[t] !== r[t]) return !0;
    return !1;
  };
function m(e, r) {
  e(r);
}
function g(o) {
  var s = r.useRef(!0),
    i = d(),
    [c, f] = r.useState(p),
    l = r.useCallback(
      (r, c) => (
        m(f, { ...p, fetching: !0 }),
        t(
          n(1)(
            u((e) => !e.hasNext)(
              a((e) => {
                s.current &&
                  m(f, {
                    fetching: !1,
                    stale: e.stale,
                    data: e.data,
                    error: e.error,
                    extensions: e.extensions,
                    operation: e.operation,
                  });
              })(i.executeMutation(e(o, r), c || {}))
            )
          )
        )
      ),
      [i, o, f]
    );
  return (
    r.useEffect(
      () => (
        (s.current = !0),
        () => {
          s.current = !1;
        }
      ),
      []
    ),
    [c, l]
  );
}
function k(t, n) {
  var u = r.useRef(void 0);
  return r.useMemo(() => {
    var r = e(t, n);
    return void 0 !== u.current && u.current.key === r.key
      ? u.current
      : ((u.current = r), r);
  }, [t, n]);
}
var b = (e) => {
    if (!e._react) {
      var r = new Set(),
        t = new Map();
      e.operations$ &&
        o((e) => {
          "teardown" === e.kind &&
            r.has(e.key) &&
            (r.delete(e.key), t.delete(e.key));
        })(e.operations$),
        (e._react = {
          get: (e) => t.get(e),
          set(e, n) {
            r.delete(e), t.set(e, n);
          },
          dispose(e) {
            r.add(e);
          },
        });
    }
    return e._react;
  },
  q = (e, r) => (r && void 0 !== r.suspense ? !!r.suspense : e.suspense);
function C(e) {
  var t = d(),
    n = b(t),
    u = q(t, e.context),
    c = k(e.query, e.variables),
    f = r.useMemo(() => {
      if (e.pause) return null;
      var r = t.executeQuery(c, {
        requestPolicy: e.requestPolicy,
        ...e.context,
      });
      return u
        ? a((e) => {
            n.set(c.key, e);
          })(r)
        : r;
    }, [n, t, c, u, e.pause, e.requestPolicy, e.context]),
    l = r.useCallback(
      (e, r) => {
        if (!e) return { fetching: !1 };
        var t = n.get(c.key);
        if (t) {
          if (r && null != t && "then" in t) throw t;
        } else {
          var u,
            a = o((e) => {
              (t = e), u && u(t);
            })(s(() => (r && !u) || !t)(e));
          if (null == t && r) {
            var i = new Promise((e) => {
              u = e;
            });
            throw (n.set(c.key, i), i);
          }
          a.unsubscribe();
        }
        return t || { fetching: !0 };
      },
      [n, c]
    ),
    v = [t, c, e.requestPolicy, e.context, e.pause],
    [x, g] = r.useState(() => [f, y(p, l(f, u)), v]),
    C = x[1];
  return (
    f !== x[0] && h(x[2], v) && g([f, (C = y(x[1], l(f, u))), v]),
    r.useEffect(() => {
      var e = x[0],
        r = x[2][1],
        t = !1,
        u = (e) => {
          (t = !0),
            m(g, (r) => {
              var t = y(r[1], e);
              return r[1] !== t ? [r[0], t, r[2]] : r;
            });
        };
      if (e) {
        var a = o(u)(
          i(() => {
            u({ fetching: !1 });
          })(e)
        );
        return (
          t || u({ fetching: !0 }),
          () => {
            n.dispose(r.key), a.unsubscribe();
          }
        );
      }
      u({ fetching: !1 });
    }, [n, x[0], x[2][1]]),
    [
      C,
      r.useCallback(
        (r) => {
          var o = { requestPolicy: e.requestPolicy, ...e.context, ...r };
          m(g, (e) => [
            u
              ? a((e) => {
                  n.set(c.key, e);
                })(t.executeQuery(c, o))
              : t.executeQuery(c, o),
            e[1],
            v,
          ]);
        },
        [t, n, c, u, e.requestPolicy, e.context, e.pause]
      ),
    ]
  );
}
function P(e, t) {
  var n = d(),
    u = k(e.query, e.variables),
    a = r.useRef(t);
  a.current = t;
  var s = r.useMemo(
      () => (e.pause ? null : n.executeSubscription(u, e.context)),
      [n, u, e.pause, e.context]
    ),
    c = [n, u, e.context, e.pause],
    [f, l] = r.useState(() => [s, { ...p, fetching: !!s }, c]),
    v = f[1];
  s !== f[0] && h(f[2], c) && l([s, (v = y(f[1], { fetching: !!s })), c]),
    r.useEffect(() => {
      var e = (e) => {
        m(l, (r) => {
          var t = y(r[1], e);
          return r[1] === t
            ? r
            : (a.current &&
                null != t.data &&
                r[1].data !== t.data &&
                (t.data = a.current(r[1].data, t.data)),
              [r[0], t, r[2]]);
        });
      };
      if (f[0])
        return o(e)(
          i(() => {
            e({ fetching: !!s });
          })(f[0])
        ).unsubscribe;
      e({ fetching: !1 });
    }, [f[0]]);
  var x = r.useCallback(
    (r) => {
      var t = n.executeSubscription(u, { ...e.context, ...r });
      m(l, (e) => [t, e[1], c]);
    },
    [n, u, e.context, e.pause]
  );
  return [v, x];
}
function w(e) {
  var r = g(e.query);
  return e.children({ ...r[0], executeMutation: r[1] });
}
function S(e) {
  var r = C(e);
  return e.children({ ...r[0], executeQuery: r[1] });
}
function M(e) {
  var r = P(e, e.handler);
  return e.children({ ...r[0], executeSubscription: r[1] });
}
export {
  v as Consumer,
  f as Context,
  w as Mutation,
  l as Provider,
  S as Query,
  M as Subscription,
  d as useClient,
  g as useMutation,
  C as useQuery,
  P as useSubscription,
};
export default null;
//# sourceMappingURL=/sm/ba03c285833b94397062f31a12a9e50e0bf9c4a04ba8edeb26dba3abe451e92e.map
