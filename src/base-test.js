/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('chai-checkmark'))
const expect = chai.expect

const pair = require('pull-pair/duplex')
const pull = require('pull-stream')
function closeAndWait (stream) {
  pull(
    pull.empty(),
    stream,
    pull.onEnd((err) => {
      expect(err).to.not.exist.mark()
    })
  )
}

function expectEnd () {
  return (err) => {
    expect(err).to.not.exist.mark()
  }
}

module.exports = (common) => {
  describe('base', () => {
    let muxer

    beforeEach((done) => {
      common.setup((err, _muxer) => {
        if (err) return done(err)
        muxer = _muxer
        done()
      })
    })

    it('Open a stream from the dialer', (done) => {
      const p = pair()
      const dialer = muxer.dial(p[0])
      const listener = muxer.listen(p[1])

      expect(4).checks(done)

      listener.on('stream', (stream) => {
        expect(stream).to.exist.mark()
        closeAndWait(stream)
      })

      const conn = dialer.newStream((err) => {
        expect(err).to.not.exist.mark()
      })

      closeAndWait(conn)
    })

    it('Open a stream from the listener', (done) => {
      const p = pair()
      const dialer = muxer.dial(p[0])
      const listener = muxer.listen(p[1])

      expect(4).check(done)

      dialer.on('stream', (stream) => {
        expect(stream).to.exist.mark()
        closeAndWait(stream)
      })

      const conn = listener.newStream((err) => {
        expect(err).to.not.exist.mark()
      })

      closeAndWait(conn)
    })

    it('Open a stream on both sides', (done) => {
      const p = pair()
      const dialer = muxer.dial(p[0])
      const listener = muxer.listen(p[1])

      expect(8).check(done)

      dialer.on('stream', (stream) => {
        expect(stream).to.exist.mark()
        closeAndWait(stream)
      })

      const listenerConn = listener.newStream((err) => {
        expect(err).to.not.exist.mark()
      })

      listener.on('stream', (stream) => {
        expect(stream).to.exist.mark()
        closeAndWait(stream)
      })

      const dialerConn = dialer.newStream((err) => {
        expect(err).to.not.exist.mark()
      })

      closeAndWait(dialerConn)
      closeAndWait(listenerConn)
    })

    it('Open a stream on one side, write, open a stream in the other side', (done) => {
      const p = pair()
      const dialer = muxer.dial(p[0])
      const listener = muxer.listen(p[1])

      expect(6).check(done)

      const dialerConn = dialer.newStream((err) => {
        expect(err).to.not.exist.mark()
      })

      pull(
        pull.values(['hey']),
        dialerConn
      )

      listener.on('stream', (stream) => {
        pull(
          stream,
          pull.collect((err, chunks) => {
            expect(err).to.not.exist.mark()
            expect(chunks).to.be.eql([Buffer('hey')]).mark()
          })
        )

        const listenerConn = listener.newStream((err) => {
          expect(err).to.not.exist.mark()
        })

        pull(
          pull.values(['hello']),
          listenerConn
        )

        dialer.on('stream', onDialerStream)
        function onDialerStream (stream) {
          pull(
            stream,
            pull.collect((err, chunks) => {
              expect(err).to.not.exist.mark()
              expect(chunks).to.be.eql([Buffer('hello')]).mark()
            })
          )
        }
      })
    })

    it('Emits close events', (done) => {
      const p = pair()
      const dialer = muxer.dial(p[0])
      const listener = muxer.listen(p[1])

      expect(2).check(done)

      const c1 = dialer.newStream()
      const c2 = listener.newStream()

      pull(pull.empty(), c1)
      pull(pull.empty(), c2)

      dialer.on('close', expectEnd())
      listener.on('close', expectEnd())

      dialer.end()
      listener.end()
    })
  })
}
