define(['require', 'module', 'jquery', 'URIjs', './markup_parser', './discover_content_type', './plain_fetcher', './zip_fetcher'],
    function (require, module, $, URI, MarkupParser, ContentTypeDiscovery, PlainExplodedFetcher, ZipFetcher) {
    console.log('resource_resolver module id: ' + module.id);


    var ResourceFetcher = function(rootUrl, libDir) {

        ResourceFetcher.contentTypePackageReadStrategyMap = {
            'application/oebps-package+xml': 'exploded',
            'application/epub+zip': 'zipped',
            'application/zip': 'zipped'
        };

        var _markupParser = new MarkupParser();

        var _isExploded = isExploded();
        var _dataFetcher = createResourceFetcher(_isExploded);

        function isExploded() {

            var ext = ".epub";
            return rootUrl.indexOf(ext, this.length - ext.length) === -1;
        }

        function createResourceFetcher(isExploded) {

            if(isExploded) {
                console.log('using new PlainExplodedFetcher');
                return new PlainExplodedFetcher(rootUrl);
            }

            console.log('using new ZipFetcher');
            return new ZipFetcher(rootUrl, libDir);

        }

        function onError(error) {
            console.log(error);
            console.trace();
        }

        function resolveResourceElements (elemName, refAttr, contentDocumentDom, contentDocumentURI, resolutionDeferreds, onerror) {

            var resolvedElems = $(elemName + '[' + refAttr + ']', contentDocumentDom);

            resolvedElems.each(function (index, resolvedElem) {
                var refAttrVal = $(resolvedElem).attr(refAttr);
                var refAttrUri = new URI(refAttrVal);

                if (refAttrUri.scheme() === '') {
                    // Relative URI, fetch from packed EPUB archive:

                    var resolutionDeferred = $.Deferred();
                    resolutionDeferreds.push(resolutionDeferred);
                    var uriRelativeToZipRoot = refAttrUri.absoluteTo(contentDocumentURI).toString();

                    _dataFetcher.relativeToPackageFetchFileContents(uriRelativeToZipRoot, 'blob', function (resourceData) {
                        $(resolvedElem).attr(refAttr, window.URL.createObjectURL(resourceData));
                        resolutionDeferred.resolve();
                    }, onerror);
                }
            });
        }

        this.isPackageExploded = function (){
            return _isExploded;
        };

        this.getPackageUrl = function() {
            return _dataFetcher.getPackageUrl();
        };


        this.resolveInternalPackageResources = function(contentDocumentURI, contentDocumentType, contentDocumentText,
                                                         resolvedDocumentCallback, onerror) {

            var contentDocumentDom = _markupParser.parseMarkup(contentDocumentText, contentDocumentType);

            var resolutionDeferreds = [];

            resolveResourceElements('img', 'src', contentDocumentDom, contentDocumentURI,
                resolutionDeferreds, onerror);
            resolveResourceElements('link', 'href', contentDocumentDom, contentDocumentURI,
                resolutionDeferreds, onerror);

            $.when.apply($, resolutionDeferreds).done(function () {
                resolvedDocumentCallback(contentDocumentDom);
            });

        };

        this.relativeToPackageFetchFileContents = function (relativePath, fetchMode, fetchCallback, onerror) {
            _dataFetcher.relativeToPackageFetchFileContents(relativePath, fetchMode, fetchCallback, onerror)
        };


        this.getPackageDom = function (callback) {

            return _dataFetcher.getPackageDom(callback, onError);
        };

    };

    return ResourceFetcher

});